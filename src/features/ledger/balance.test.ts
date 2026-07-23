import { describe, it, expect } from 'vitest';
import { computeDonationSplit, type FeeSchedule } from '@/features/payments/fees';
import { buildDonationPaidEntries, buildRefundEntries } from './postings';
import { computeBalanceFromEntries } from './balance';

const fee: FeeSchedule = {
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

function paidEntries(gross: number, releaseImmediately = true) {
  const split = computeDonationSplit(gross, fee);
  return buildDonationPaidEntries({
    groupId: 'g1',
    campaignId: 'c1',
    donationId: `d-${gross}`,
    chargeId: `ch-${gross}`,
    webhookEventId: 'w1',
    split,
    releaseImmediately,
  });
}

describe('ledger — postings e saldo', () => {
  it('doação paga credita o líquido em available e registra taxas', () => {
    const bal = computeBalanceFromEntries(paidEntries(10000));
    expect(bal.raisedGrossCents).toBe(10000);
    expect(bal.platformFeeCents).toBe(500);
    expect(bal.gatewayFeeCents).toBe(99);
    expect(bal.netCents).toBe(9401);
    expect(bal.availableCents).toBe(9401);
    expect(bal.pendingCents).toBe(0);
  });

  it('com carência, credita em pending (não available)', () => {
    const bal = computeBalanceFromEntries(paidEntries(10000, false));
    expect(bal.pendingCents).toBe(9401);
    expect(bal.availableCents).toBe(0);
  });

  it('soma múltiplas doações', () => {
    const entries = [...paidEntries(10000), ...paidEntries(5000)];
    const bal = computeBalanceFromEntries(entries);
    expect(bal.raisedGrossCents).toBe(15000);
    expect(bal.availableCents).toBe(9401 + computeDonationSplit(5000, fee).netCents);
  });

  it('reembolso debita o líquido e estorna a taxa da plataforma', () => {
    const split = computeDonationSplit(10000, fee);
    const entries = [
      ...paidEntries(10000),
      ...buildRefundEntries({
        groupId: 'g2',
        campaignId: 'c1',
        donationId: 'd-10000',
        chargeId: 'ch-10000',
        refundId: 'r1',
        webhookEventId: 'w2',
        split,
        fromAvailable: true,
      }),
    ];
    const bal = computeBalanceFromEntries(entries);
    expect(bal.availableCents).toBe(0); // 9401 creditado - 9401 debitado
    expect(bal.refundedCents).toBe(split.netCents + split.platformFeeCents);
  });

  it('todo lançamento de doação carrega idempotency_key único por componente', () => {
    const keys = paidEntries(10000).map((e) => e.idempotencyKey);
    expect(new Set(keys).size).toBe(keys.length);
  });
});
