import 'server-only';
import { getServerEnv } from '@/env';
import { MockPaymentProvider } from '@/features/payments/mock-provider';
import { WooviPaymentProvider } from '@/features/payments/woovi-provider';
import type { PaymentProvider, ProviderName } from '@/features/payments/provider';
import { processWebhook, type ProcessResult } from '@/features/webhooks/processor';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { SupabaseWebhookRepository } from './webhook-repository';
import { logger } from '@/lib/logger';

function providerFor(name: ProviderName): PaymentProvider {
  const env = getServerEnv();
  if (name === 'woovi') {
    return new WooviPaymentProvider({
      enabled: env.WOOVI_ENABLED && !!env.WOOVI_APP_ID,
      appId: env.WOOVI_APP_ID,
      baseUrl: env.WOOVI_API_BASE_URL,
      hmacSecret: env.WOOVI_WEBHOOK_HMAC_SECRET,
    });
  }
  return new MockPaymentProvider(env.MOCK_WEBHOOK_SECRET);
}

/**
 * Handler central de webhook: valida assinatura, normaliza o evento e processa
 * pelo pipeline idempotente. Usado pela rota /api/webhooks/* e pela simulação (dev).
 */
export async function handleWebhook(
  name: ProviderName,
  rawBody: string,
  headers: Record<string, string>,
): Promise<ProcessResult> {
  const provider = providerFor(name);
  const verification = provider.verifyWebhook(rawBody, headers);
  const parsed = provider.parseWebhook(rawBody, headers);

  const admin = createSupabaseAdminClient();
  const repo = new SupabaseWebhookRepository(admin);
  const fee = await repo.getActiveFeeSchedule();

  const result = await processWebhook(parsed, verification.valid, repo, {
    releaseImmediately: fee.releaseDelayDays === 0,
  });

  logger.info('webhook_processed', {
    correlationId: parsed.correlationId,
    webhookEventId: result.webhookEventId,
    // não loga payload bruto nem dados sensíveis
    outcome: result.outcome,
    provider: name,
  });

  return result;
}
