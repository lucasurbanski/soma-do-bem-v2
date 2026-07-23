import { describe, it, expect } from 'vitest';
import { computeDonationSplit, isValidContribution, refundableAmount, type FeeSchedule } from './fees';

const fee: FeeSchedule = {
  version: 1,
  platformFeeBps: 500, // 5%
  gatewayFeeBps: 99, // 0,99%
  gatewayFeeFixedCents: 0,
  minContributionCents: 500,
  minWithdrawalCents: 2000,
  withdrawalFeeCents: 0,
  chargebackReserveBps: 0,
  releaseDelayDays: 0,
};

describe('fees — split de doação', () => {
  it('mantém a invariante gross = gateway + platform + net', () => {
    for (const gross of [500, 1000, 2599, 10000, 108586, 999999]) {
      const s = computeDonationSplit(gross, fee);
      expect(s.gatewayFeeCents + s.platformFeeCents + s.netCents).toBe(gross);
      expect(s.netCents).toBeGreaterThanOrEqual(0);
    }
  });

  it('calcula corretamente um caso conhecido (R$100,00)', () => {
    const s = computeDonationSplit(10000, fee);
    expect(s.platformFeeCents).toBe(500); // 5%
    expect(s.gatewayFeeCents).toBe(99); // 0,99%
    expect(s.netCents).toBe(9401);
    expect(s.feeVersion).toBe(1);
  });

  it('soma taxa fixa do gateway quando configurada', () => {
    const s = computeDonationSplit(10000, { ...fee, gatewayFeeFixedCents: 40 });
    expect(s.gatewayFeeCents).toBe(139);
    expect(s.gatewayFeeCents + s.platformFeeCents + s.netCents).toBe(10000);
  });

  it('rejeita valor não positivo', () => {
    expect(() => computeDonationSplit(0, fee)).toThrow();
    expect(() => computeDonationSplit(-100, fee)).toThrow();
  });

  it('lança quando as taxas excedem o bruto', () => {
    const abusive: FeeSchedule = { ...fee, platformFeeBps: 9000, gatewayFeeBps: 2000 };
    expect(() => computeDonationSplit(100, abusive)).toThrow();
  });

  it('valida contribuição mínima', () => {
    expect(isValidContribution(500, fee)).toBe(true);
    expect(isValidContribution(499, fee)).toBe(false);
  });

  it('calcula valor reembolsável', () => {
    expect(refundableAmount(10000, 0)).toBe(10000);
    expect(refundableAmount(10000, 4000)).toBe(6000);
    expect(refundableAmount(10000, 12000)).toBe(0);
  });
});
