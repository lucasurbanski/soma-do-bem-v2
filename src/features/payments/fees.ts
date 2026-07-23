/**
 * Cálculo de taxas — SEMPRE no servidor, a partir de configuração VERSIONADA
 * (tabela platform_fees). Nunca há números de taxa espalhados no código de UI.
 */
import { applyBps, assertCents, type Cents } from '@/lib/money';

export interface FeeSchedule {
  version: number;
  platformFeeBps: number;
  gatewayFeeBps: number;
  gatewayFeeFixedCents: Cents;
  minContributionCents: Cents;
  minWithdrawalCents: Cents;
  withdrawalFeeCents: Cents;
  chargebackReserveBps: number;
  releaseDelayDays: number;
}

export interface DonationSplit {
  grossCents: Cents;
  gatewayFeeCents: Cents;
  platformFeeCents: Cents;
  /** valor pertencente à vaquinha = gross - gateway - platform */
  netCents: Cents;
  feeVersion: number;
}

/**
 * Divide o valor bruto de uma doação nos componentes financeiros.
 * Invariante garantida: gross === gatewayFee + platformFee + net.
 */
export function computeDonationSplit(grossCents: Cents, fee: FeeSchedule): DonationSplit {
  assertCents(grossCents);
  if (grossCents <= 0) {
    throw new Error('grossCents deve ser positivo');
  }
  const gatewayFeeCents = applyBps(grossCents, fee.gatewayFeeBps) + fee.gatewayFeeFixedCents;
  const platformFeeCents = applyBps(grossCents, fee.platformFeeBps);
  const netCents = grossCents - gatewayFeeCents - platformFeeCents;
  if (netCents < 0) {
    throw new Error(
      `Taxas (${gatewayFeeCents + platformFeeCents}) excedem o valor bruto (${grossCents})`,
    );
  }
  return {
    grossCents,
    gatewayFeeCents,
    platformFeeCents,
    netCents,
    feeVersion: fee.version,
  };
}

/** Valida se o valor atende ao mínimo de contribuição. */
export function isValidContribution(grossCents: Cents, fee: FeeSchedule): boolean {
  return Number.isInteger(grossCents) && grossCents >= fee.minContributionCents;
}

/** Valor do reembolso máximo possível para uma doação paga (bruto - já reembolsado). */
export function refundableAmount(grossCents: Cents, alreadyRefundedCents: Cents): Cents {
  return Math.max(0, grossCents - alreadyRefundedCents);
}
