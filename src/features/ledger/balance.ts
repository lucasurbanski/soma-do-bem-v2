/**
 * Redutor PURO de saldo a partir dos lançamentos do ledger.
 * Espelha exatamente a função SQL campaign_ledger_balance (fonte oficial).
 * Usado em testes e em cálculos server-side quando conveniente.
 */
import type { Cents } from '@/lib/money';
import type { CampaignBalance, LedgerEntryInput } from './types';

type MinimalEntry = Pick<
  LedgerEntryInput,
  'account' | 'entryType' | 'direction' | 'amountCents'
>;

export function computeBalanceFromEntries(entries: readonly MinimalEntry[]): CampaignBalance {
  const acc: CampaignBalance = {
    raisedGrossCents: 0,
    platformFeeCents: 0,
    gatewayFeeCents: 0,
    netCents: 0,
    pendingCents: 0,
    availableCents: 0,
    withdrawnCents: 0,
    refundedCents: 0,
  };

  for (const e of entries) {
    const signed: Cents = e.direction * e.amountCents;
    if (e.entryType === 'donation_gross') acc.raisedGrossCents += e.amountCents;
    if (e.entryType === 'platform_fee') acc.platformFeeCents += e.amountCents;
    if (e.entryType === 'gateway_fee') acc.gatewayFeeCents += e.amountCents;
    if (e.entryType === 'campaign_credit') acc.netCents += signed;
    if (e.account === 'campaign_pending') acc.pendingCents += signed;
    if (e.account === 'campaign_available') acc.availableCents += signed;
    if (e.account === 'campaign_withdrawn') acc.withdrawnCents += signed;
    if (e.entryType === 'refund' || e.entryType === 'chargeback') acc.refundedCents += e.amountCents;
  }
  return acc;
}
