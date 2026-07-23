/**
 * Geração de lançamentos (postings) do ledger para cada evento financeiro.
 * Funções PURAS: recebem os dados do evento e devolvem os lançamentos a inserir
 * em UMA transação. A idempotência é garantida por idempotencyKey único por
 * componente do evento (índice único uq_ledger_idempotency no banco).
 */
import type { DonationSplit } from '@/features/payments/fees';
import type { LedgerEntryInput } from './types';

export interface DonationPaidContext {
  groupId: string;
  campaignId: string;
  donationId: string;
  chargeId: string;
  webhookEventId: string | null;
  split: DonationSplit;
  /** se releaseDelayDays === 0, credita direto em campaign_available */
  releaseImmediately: boolean;
}

/**
 * Lançamentos de uma DOAÇÃO PAGA.
 * Invariante de valor: gross === gatewayFee + platformFee + net.
 * Contas:
 *  - gateway_clearing recebe o bruto (donation_gross)
 *  - gateway_fee_expense recebe a taxa do gateway
 *  - platform_revenue recebe a taxa da plataforma
 *  - campaign_pending|available recebe o líquido do organizador
 */
export function buildDonationPaidEntries(ctx: DonationPaidContext): LedgerEntryInput[] {
  const { groupId, campaignId, donationId, chargeId, webhookEventId, split } = ctx;
  const base = {
    groupId,
    campaignId,
    donationId,
    chargeId,
    webhookEventId,
    direction: 1 as const,
  };
  const creditAccount = ctx.releaseImmediately ? 'campaign_available' : 'campaign_pending';

  return [
    {
      ...base,
      account: 'gateway_clearing',
      entryType: 'donation_gross',
      amountCents: split.grossCents,
      idempotencyKey: `${donationId}:donation_paid:donation_gross`,
      memo: 'Doação recebida (bruto)',
    },
    {
      ...base,
      account: 'gateway_fee_expense',
      entryType: 'gateway_fee',
      amountCents: split.gatewayFeeCents,
      idempotencyKey: `${donationId}:donation_paid:gateway_fee`,
      memo: 'Taxa do gateway',
    },
    {
      ...base,
      account: 'platform_revenue',
      entryType: 'platform_fee',
      amountCents: split.platformFeeCents,
      idempotencyKey: `${donationId}:donation_paid:platform_fee`,
      memo: 'Taxa da plataforma',
    },
    {
      ...base,
      account: creditAccount,
      entryType: 'campaign_credit',
      amountCents: split.netCents,
      idempotencyKey: `${donationId}:donation_paid:campaign_credit`,
      memo: 'Valor líquido da vaquinha',
    },
  ];
}

/**
 * Lançamentos de um REEMBOLSO (estorno) de doação já paga.
 * Debita o líquido do organizador e estorna as taxas conforme política.
 */
export function buildRefundEntries(args: {
  groupId: string;
  campaignId: string;
  donationId: string;
  chargeId: string;
  refundId: string;
  webhookEventId: string | null;
  split: DonationSplit;
  fromAvailable: boolean;
}): LedgerEntryInput[] {
  const { groupId, campaignId, donationId, chargeId, refundId, webhookEventId, split } = args;
  const debitAccount = args.fromAvailable ? 'campaign_available' : 'campaign_pending';
  return [
    {
      groupId,
      campaignId,
      donationId,
      chargeId,
      refundId,
      webhookEventId,
      account: debitAccount,
      entryType: 'refund',
      direction: -1,
      amountCents: split.netCents,
      idempotencyKey: `${refundId}:refund:campaign_debit`,
      memo: 'Estorno do valor líquido da vaquinha',
    },
    {
      groupId,
      campaignId,
      donationId,
      chargeId,
      refundId,
      webhookEventId,
      account: 'platform_revenue',
      entryType: 'refund',
      direction: -1,
      amountCents: split.platformFeeCents,
      idempotencyKey: `${refundId}:refund:platform_reversal`,
      memo: 'Estorno da taxa da plataforma',
    },
  ];
}
