import 'server-only';
import { getServerEnv } from '@/env';

export type FeatureFlag =
  | 'PAYMENTS_ENABLED'
  | 'WOOVI_ENABLED'
  | 'WOOVI_SPLIT_ENABLED'
  | 'WOOVI_SUBACCOUNTS_ENABLED'
  | 'WITHDRAWALS_ENABLED'
  | 'KYC_ENABLED';

/**
 * Flags a partir do ambiente (server-side). A tabela feature_flags no banco é a
 * fonte de verdade para flags de produto (corações/emojis etc.); estas flags de
 * ambiente controlam a habilitação de infraestrutura sensível (pagamentos/saques).
 */
export function getFeatureFlags() {
  const env = getServerEnv();
  return {
    PAYMENTS_ENABLED: env.PAYMENTS_ENABLED,
    WOOVI_ENABLED: env.WOOVI_ENABLED,
    WOOVI_SPLIT_ENABLED: env.WOOVI_SPLIT_ENABLED,
    WOOVI_SUBACCOUNTS_ENABLED: env.WOOVI_SUBACCOUNTS_ENABLED,
    WITHDRAWALS_ENABLED: env.WITHDRAWALS_ENABLED,
    KYC_ENABLED: env.KYC_ENABLED,
  } satisfies Record<FeatureFlag, boolean>;
}

export function isEnabled(flag: FeatureFlag): boolean {
  return getFeatureFlags()[flag];
}
