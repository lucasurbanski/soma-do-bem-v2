import type { Cents } from '@/lib/money';

export type LedgerAccount =
  | 'gateway_clearing'
  | 'gateway_fee_expense'
  | 'platform_revenue'
  | 'campaign_pending'
  | 'campaign_available'
  | 'campaign_withdrawn'
  | 'chargeback_reserve';

export type LedgerEntryType =
  | 'donation_gross'
  | 'gateway_fee'
  | 'platform_fee'
  | 'campaign_credit'
  | 'hold'
  | 'hold_release'
  | 'refund'
  | 'chargeback'
  | 'chargeback_reserve'
  | 'chargeback_reserve_release'
  | 'withdrawal_hold'
  | 'withdrawal_paid'
  | 'adjustment';

/** Um lançamento a inserir no ledger (imutável). */
export interface LedgerEntryInput {
  groupId: string;
  campaignId: string | null;
  account: LedgerAccount;
  entryType: LedgerEntryType;
  direction: 1 | -1;
  amountCents: Cents;
  donationId?: string | null;
  chargeId?: string | null;
  refundId?: string | null;
  withdrawalId?: string | null;
  webhookEventId?: string | null;
  idempotencyKey: string;
  memo?: string;
}

export interface CampaignBalance {
  raisedGrossCents: Cents;
  platformFeeCents: Cents;
  gatewayFeeCents: Cents;
  netCents: Cents;
  pendingCents: Cents;
  availableCents: Cents;
  withdrawnCents: Cents;
  refundedCents: Cents;
}
