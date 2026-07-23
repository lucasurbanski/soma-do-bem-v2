import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { FeeSchedule } from '@/features/payments/fees';
import type { ParsedWebhook } from '@/features/payments/provider';
import {
  LedgerIdempotencyError,
  type ApplyDonationPaidArgs,
  type ChargeRecord,
  type WebhookRepository,
} from '@/features/webhooks/processor';

/**
 * Implementação do WebhookRepository sobre o Supabase (service role).
 * A aplicação da doação paga é delegada à função SQL apply_donation_paid,
 * que roda em uma transação e garante idempotência via idempotency_key único.
 */
export class SupabaseWebhookRepository implements WebhookRepository {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(private readonly admin: SupabaseClient<any>) {}

  async recordWebhookEvent(parsed: ParsedWebhook, signatureValid: boolean) {
    const row = {
      provider: parsed.provider,
      event_id: parsed.eventId,
      event_type: parsed.eventType,
      signature_valid: signatureValid,
      raw_payload: parsed.raw as object,
    };
    const { data } = await this.admin
      .from('payment_webhook_events')
      .upsert(row, { onConflict: 'provider,event_id', ignoreDuplicates: true })
      .select('id');

    const inserted = data?.[0];
    if (inserted) {
      return { webhookEventId: inserted.id as string, alreadyProcessed: false };
    }
    // Conflito: evento já existia.
    const { data: existing } = await this.admin
      .from('payment_webhook_events')
      .select('id')
      .eq('provider', parsed.provider)
      .eq('event_id', parsed.eventId)
      .single();
    return { webhookEventId: existing!.id as string, alreadyProcessed: true };
  }

  async getChargeByCorrelation(provider: string, correlationId: string): Promise<ChargeRecord | null> {
    const { data: charge } = await this.admin
      .from('payment_charges')
      .select('id, donation_id, status, amount_cents')
      .eq('provider', provider)
      .eq('correlation_id', correlationId)
      .maybeSingle();
    if (!charge) return null;

    const { data: donation } = await this.admin
      .from('donations')
      .select('campaign_id')
      .eq('id', charge.donation_id)
      .single();

    return {
      id: charge.id,
      donationId: charge.donation_id,
      campaignId: donation!.campaign_id,
      status: charge.status,
      amountCents: Number(charge.amount_cents),
    };
  }

  async getActiveFeeSchedule(): Promise<FeeSchedule> {
    const { data } = await this.admin
      .from('platform_fees')
      .select('*')
      .eq('is_active', true)
      .single();
    return {
      version: data!.version,
      platformFeeBps: data!.platform_fee_bps,
      gatewayFeeBps: data!.gateway_fee_bps,
      gatewayFeeFixedCents: Number(data!.gateway_fee_fixed_cents),
      minContributionCents: Number(data!.min_contribution_cents),
      minWithdrawalCents: Number(data!.min_withdrawal_cents),
      withdrawalFeeCents: Number(data!.withdrawal_fee_cents),
      chargebackReserveBps: data!.chargeback_reserve_bps,
      releaseDelayDays: data!.release_delay_days,
    };
  }

  async applyDonationPaid(args: ApplyDonationPaidArgs): Promise<void> {
    const byType = (t: string) => args.entries.find((e) => e.entryType === t)?.amountCents ?? 0;
    const releaseImmediately = args.entries.some(
      (e) => e.entryType === 'campaign_credit' && e.account === 'campaign_available',
    );

    const { error } = await this.admin.rpc('apply_donation_paid', {
      p_charge_id: args.charge.id,
      p_webhook_event_id: args.webhookEventId,
      p_paid_at: args.paidAt,
      p_gross: byType('donation_gross'),
      p_gateway_fee: byType('gateway_fee'),
      p_platform_fee: byType('platform_fee'),
      p_net: byType('campaign_credit'),
      p_release_immediately: releaseImmediately,
    });

    if (error) {
      // 23505 = unique_violation (idempotency_key já existe)
      if (error.code === '23505') {
        throw new LedgerIdempotencyError(args.charge.donationId);
      }
      throw new Error(`apply_donation_paid falhou: ${error.message}`);
    }
  }

  async markWebhookProcessed(webhookEventId: string, error?: string): Promise<void> {
    await this.admin
      .from('payment_webhook_events')
      .update({ processed_at: new Date().toISOString(), processing_error: error ?? null })
      .eq('id', webhookEventId);
  }

  async markChargeExpired(chargeId: string): Promise<void> {
    const { data: charge } = await this.admin
      .from('payment_charges')
      .update({ status: 'expired' })
      .eq('id', chargeId)
      .select('donation_id')
      .single();
    if (charge) {
      await this.admin
        .from('donations')
        .update({ status: 'expired' })
        .eq('id', charge.donation_id)
        .neq('status', 'paid');
    }
  }
}
