/**
 * Pipeline de processamento de webhook — IDEMPOTENTE e auditável.
 *
 * Duas barreiras de idempotência:
 *  1. (provider, event_id) único em payment_webhook_events — impede reprocessar o mesmo evento.
 *  2. idempotency_key único em ledger_entries — impede lançar 2x o mesmo componente,
 *     mesmo sob concorrência (duas execuções simultâneas do mesmo evento).
 *
 * A lógica aqui é agnóstica de banco: opera sobre WebhookRepository, o que a torna
 * testável com um repositório em memória (ver processor.test.ts). A implementação real
 * (Supabase/Postgres, transacional) fica em src/server.
 *
 * REGRA: nenhuma confirmação vinda do frontend marca doação como paga. Só este pipeline
 * (disparado por webhook do provedor ou reconciliação server-side) muda o status para 'paid'.
 */
import type { FeeSchedule } from '@/features/payments/fees';
import { computeDonationSplit } from '@/features/payments/fees';
import type { ParsedWebhook } from '@/features/payments/provider';
import { buildDonationPaidEntries } from '@/features/ledger/postings';
import type { LedgerEntryInput } from '@/features/ledger/types';

export interface ChargeRecord {
  id: string;
  donationId: string;
  campaignId: string;
  status: string;
  amountCents: number;
}

export interface ApplyDonationPaidArgs {
  charge: ChargeRecord;
  entries: LedgerEntryInput[];
  webhookEventId: string;
  paidAt: string;
}

export interface WebhookRepository {
  /** insert ... on conflict do nothing. Retorna se já existia (idempotência forte). */
  recordWebhookEvent(parsed: ParsedWebhook, signatureValid: boolean): Promise<{
    webhookEventId: string;
    alreadyProcessed: boolean;
  }>;
  getChargeByCorrelation(provider: string, correlationId: string): Promise<ChargeRecord | null>;
  getActiveFeeSchedule(): Promise<FeeSchedule>;
  /**
   * Aplica, EM UMA TRANSAÇÃO: status da cobrança/doação = paid, insere os lançamentos
   * do ledger (idempotency_key único) e atualiza o cache da campanha.
   * DEVE lançar LedgerIdempotencyError se algum idempotency_key já existir.
   */
  applyDonationPaid(args: ApplyDonationPaidArgs): Promise<void>;
  markWebhookProcessed(webhookEventId: string, error?: string): Promise<void>;
  markChargeExpired(chargeId: string): Promise<void>;
}

export class LedgerIdempotencyError extends Error {
  constructor(key: string) {
    super(`idempotency_key já existe: ${key}`);
    this.name = 'LedgerIdempotencyError';
  }
}

export type WebhookOutcome =
  | 'processed'
  | 'duplicate'
  | 'already_paid'
  | 'already_posted'
  | 'charge_not_found'
  | 'expired'
  | 'ignored'
  | 'invalid_signature';

export interface ProcessResult {
  outcome: WebhookOutcome;
  webhookEventId?: string;
}

export async function processWebhook(
  parsed: ParsedWebhook,
  signatureValid: boolean,
  repo: WebhookRepository,
  opts: { releaseImmediately: boolean },
): Promise<ProcessResult> {
  if (!signatureValid) {
    return { outcome: 'invalid_signature' };
  }

  // Barreira 1: registra o evento; se já existia, é duplicado.
  const rec = await repo.recordWebhookEvent(parsed, signatureValid);
  if (rec.alreadyProcessed) {
    return { outcome: 'duplicate', webhookEventId: rec.webhookEventId };
  }

  try {
    if (parsed.chargeStatus === 'paid') {
      const charge = await repo.getChargeByCorrelation(
        parsed.provider,
        parsed.correlationId ?? '',
      );
      if (!charge) {
        await repo.markWebhookProcessed(rec.webhookEventId, 'charge_not_found');
        return { outcome: 'charge_not_found', webhookEventId: rec.webhookEventId };
      }
      if (charge.status === 'paid') {
        await repo.markWebhookProcessed(rec.webhookEventId);
        return { outcome: 'already_paid', webhookEventId: rec.webhookEventId };
      }

      const fee = await repo.getActiveFeeSchedule();
      const split = computeDonationSplit(charge.amountCents, fee);
      const entries = buildDonationPaidEntries({
        groupId: charge.id,
        campaignId: charge.campaignId,
        donationId: charge.donationId,
        chargeId: charge.id,
        webhookEventId: rec.webhookEventId,
        split,
        releaseImmediately: opts.releaseImmediately,
      });

      try {
        await repo.applyDonationPaid({
          charge,
          entries,
          webhookEventId: rec.webhookEventId,
          paidAt: parsed.occurredAt ?? new Date().toISOString(),
        });
      } catch (e) {
        if (e instanceof LedgerIdempotencyError) {
          // Barreira 2: outra execução já postou os lançamentos — trata como idempotente.
          await repo.markWebhookProcessed(rec.webhookEventId);
          return { outcome: 'already_posted', webhookEventId: rec.webhookEventId };
        }
        throw e;
      }

      await repo.markWebhookProcessed(rec.webhookEventId);
      return { outcome: 'processed', webhookEventId: rec.webhookEventId };
    }

    if (parsed.chargeStatus === 'expired') {
      const charge = await repo.getChargeByCorrelation(
        parsed.provider,
        parsed.correlationId ?? '',
      );
      if (charge) await repo.markChargeExpired(charge.id);
      await repo.markWebhookProcessed(rec.webhookEventId);
      return { outcome: 'expired', webhookEventId: rec.webhookEventId };
    }

    await repo.markWebhookProcessed(rec.webhookEventId);
    return { outcome: 'ignored', webhookEventId: rec.webhookEventId };
  } catch (e) {
    await repo.markWebhookProcessed(
      rec.webhookEventId,
      e instanceof Error ? e.message : 'unknown',
    );
    throw e;
  }
}
