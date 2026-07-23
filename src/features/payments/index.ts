import 'server-only';
import { getServerEnv } from '@/env';
import { MockPaymentProvider } from './mock-provider';
import { WooviPaymentProvider } from './woovi-provider';
import type { PaymentProvider } from './provider';

/**
 * Fábrica do provedor de pagamentos ativo.
 * Enquanto PAYMENTS_ENABLED/WOOVI_ENABLED forem false, retorna SEMPRE o mock.
 */
export function getPaymentProvider(): PaymentProvider {
  const env = getServerEnv();
  if (env.PAYMENTS_ENABLED && env.WOOVI_ENABLED && env.WOOVI_APP_ID) {
    return new WooviPaymentProvider({
      enabled: true,
      appId: env.WOOVI_APP_ID,
      baseUrl: env.WOOVI_API_BASE_URL,
      hmacSecret: env.WOOVI_WEBHOOK_HMAC_SECRET,
    });
  }
  return new MockPaymentProvider(env.MOCK_WEBHOOK_SECRET);
}

export function getActiveProviderName(): 'mock' | 'woovi' {
  const env = getServerEnv();
  return env.PAYMENTS_ENABLED && env.WOOVI_ENABLED && env.WOOVI_APP_ID ? 'woovi' : 'mock';
}

export * from './provider';
export * from './fees';
