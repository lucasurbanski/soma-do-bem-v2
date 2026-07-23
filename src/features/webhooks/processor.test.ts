import { describe, it, expect, beforeEach } from 'vitest';
import type { FeeSchedule } from '@/features/payments/fees';
import type { ParsedWebhook } from '@/features/payments/provider';
import { computeBalanceFromEntries } from '@/features/ledger/balance';
import type { LedgerEntryInput } from '@/features/ledger/types';
import {
  LedgerIdempotencyError,
  processWebhook,
  type ApplyDonationPaidArgs,
  type ChargeRecord,
  type WebhookRepository,
} from './processor';

const FEE: FeeSchedule = {
  version: 1,
  platformFeeBps: 500,
  gatewayFeeBps: 99,
  gatewayFeeFixedCents: 0,
  minContributionCents: 500,
  minWithdrawalCents: 2000,
  withdrawalFeeCents: 0,
  chargebackReserveBps: 0,
  releaseDelayDays: 0,
};

/**
 * Repositório em memória que modela as DUAS constraints únicas do banco:
 *  - (provider, event_id) em payment_webhook_events
 *  - idempotency_key em ledger_entries
 * `leakyWebhook` simula uma corrida em que ambas as execuções passam pela barreira 1,
 * deixando a barreira 2 (ledger) garantir a não-duplicação.
 */
class InMemoryRepo implements WebhookRepository {
  webhookEvents = new Set<string>();
  ledger: LedgerEntryInput[] = [];
  ledgerKeys = new Set<string>();
  charge: ChargeRecord;
  processedCount = 0;
  leakyWebhook = false;

  constructor(charge: ChargeRecord) {
    this.charge = charge;
  }

  async recordWebhookEvent(parsed: ParsedWebhook) {
    const key = `${parsed.provider}:${parsed.eventId}`;
    const webhookEventId = `we_${parsed.eventId}`;
    if (this.leakyWebhook) {
      return { webhookEventId, alreadyProcessed: false };
    }
    if (this.webhookEvents.has(key)) {
      return { webhookEventId, alreadyProcessed: true };
    }
    this.webhookEvents.add(key);
    return { webhookEventId, alreadyProcessed: false };
  }

  async getChargeByCorrelation(_p: string, correlationId: string) {
    return correlationId === this.charge.id ? { ...this.charge } : null;
  }

  async getActiveFeeSchedule() {
    return FEE;
  }

  async applyDonationPaid(args: ApplyDonationPaidArgs) {
    // atomicidade estilo transação: valida TODAS as chaves antes de inserir
    for (const e of args.entries) {
      if (this.ledgerKeys.has(e.idempotencyKey)) {
        throw new LedgerIdempotencyError(e.idempotencyKey);
      }
    }
    for (const e of args.entries) {
      this.ledgerKeys.add(e.idempotencyKey);
      this.ledger.push(e);
    }
    this.charge.status = 'paid';
    this.processedCount += 1;
  }

  async markWebhookProcessed() {}
  async markChargeExpired() {
    this.charge.status = 'expired';
  }
}

function paidEvent(correlationId: string, eventId: string): ParsedWebhook {
  return {
    provider: 'mock',
    eventId,
    eventType: 'mock.charge.paid',
    chargeStatus: 'paid',
    correlationId,
    externalChargeId: `mock_${correlationId}`,
    amountCents: 10000,
    occurredAt: '2026-07-23T12:00:00.000Z',
    raw: {},
  };
}

describe('processWebhook — idempotência e concorrência', () => {
  let repo: InMemoryRepo;
  const charge: ChargeRecord = {
    id: 'charge-1',
    donationId: 'don-1',
    campaignId: 'camp-1',
    status: 'pending',
    amountCents: 10000,
  };

  beforeEach(() => {
    repo = new InMemoryRepo({ ...charge });
  });

  it('processa um evento pago e cria exatamente 4 lançamentos', async () => {
    const res = await processWebhook(paidEvent('charge-1', 'ev-1'), true, repo, {
      releaseImmediately: true,
    });
    expect(res.outcome).toBe('processed');
    expect(repo.ledger).toHaveLength(4);
    const bal = computeBalanceFromEntries(repo.ledger);
    expect(bal.raisedGrossCents).toBe(10000);
    expect(bal.availableCents).toBe(9401);
  });

  it('rejeita assinatura inválida sem tocar no ledger', async () => {
    const res = await processWebhook(paidEvent('charge-1', 'ev-1'), false, repo, {
      releaseImmediately: true,
    });
    expect(res.outcome).toBe('invalid_signature');
    expect(repo.ledger).toHaveLength(0);
  });

  it('EVENTO DUPLICADO (mesmo event_id) não duplica lançamentos', async () => {
    await processWebhook(paidEvent('charge-1', 'ev-1'), true, repo, { releaseImmediately: true });
    const second = await processWebhook(paidEvent('charge-1', 'ev-1'), true, repo, {
      releaseImmediately: true,
    });
    expect(second.outcome).toBe('duplicate');
    expect(repo.ledger).toHaveLength(4);
    expect(repo.processedCount).toBe(1);
  });

  it('CONCORRÊNCIA: mesmo evento em paralelo posta apenas um conjunto', async () => {
    repo.leakyWebhook = true; // força ambos a passar pela barreira 1
    const [a, b] = await Promise.all([
      processWebhook(paidEvent('charge-1', 'ev-1'), true, repo, { releaseImmediately: true }),
      processWebhook(paidEvent('charge-1', 'ev-1'), true, repo, { releaseImmediately: true }),
    ]);
    const outcomes = [a.outcome, b.outcome].sort();
    expect(outcomes).toEqual(['already_posted', 'processed']);
    expect(repo.ledger).toHaveLength(4); // barreira 2 (ledger) garantiu unicidade
    expect(repo.processedCount).toBe(1);
  });

  it('evento de cobrança não encontrada é tratado', async () => {
    const res = await processWebhook(paidEvent('inexistente', 'ev-9'), true, repo, {
      releaseImmediately: true,
    });
    expect(res.outcome).toBe('charge_not_found');
    expect(repo.ledger).toHaveLength(0);
  });
});
