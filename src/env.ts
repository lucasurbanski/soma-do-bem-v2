/**
 * Validação de variáveis de ambiente com Zod.
 * - Variáveis NEXT_PUBLIC_* podem ir ao browser.
 * - Segredos (service role, DB, secrets) só são lidos em código de servidor.
 * NUNCA importe `serverEnv` em componentes de cliente.
 */
import { z } from 'zod';

const publicSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  NEXT_PUBLIC_POSTHOG_KEY: z.string().optional(),
  NEXT_PUBLIC_POSTHOG_HOST: z.string().optional(),
});

export const publicEnv = publicSchema.parse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_POSTHOG_KEY: process.env.NEXT_PUBLIC_POSTHOG_KEY,
  NEXT_PUBLIC_POSTHOG_HOST: process.env.NEXT_PUBLIC_POSTHOG_HOST,
});

const flag = z
  .string()
  .optional()
  .transform((v) => v === 'true');

const serverSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  DATABASE_URL: z.string().optional(),
  APP_BASE_URL: z.string().url().default('http://localhost:3000'),
  MOCK_WEBHOOK_SECRET: z.string().min(1).default('dev-mock-webhook-secret-change-me'),
  WOOVI_API_BASE_URL: z.string().default('https://api.woovi-sandbox.com'),
  WOOVI_APP_ID: z.string().optional().default(''),
  WOOVI_WEBHOOK_HMAC_SECRET: z.string().optional(),
  WOOVI_WEBHOOK_PUBLIC_KEY: z.string().optional(),
  PAYMENTS_ENABLED: flag,
  WOOVI_ENABLED: flag,
  WOOVI_SPLIT_ENABLED: flag,
  WOOVI_SUBACCOUNTS_ENABLED: flag,
  WITHDRAWALS_ENABLED: flag,
  KYC_ENABLED: flag,
});

/**
 * Lê e valida as variáveis de servidor. Chame apenas em código server-side.
 * Lança em runtime se um segredo obrigatório faltar.
 */
export function getServerEnv() {
  return serverSchema.parse({
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    DATABASE_URL: process.env.DATABASE_URL,
    APP_BASE_URL: process.env.APP_BASE_URL,
    MOCK_WEBHOOK_SECRET: process.env.MOCK_WEBHOOK_SECRET,
    WOOVI_API_BASE_URL: process.env.WOOVI_API_BASE_URL,
    WOOVI_APP_ID: process.env.WOOVI_APP_ID,
    WOOVI_WEBHOOK_HMAC_SECRET: process.env.WOOVI_WEBHOOK_HMAC_SECRET,
    WOOVI_WEBHOOK_PUBLIC_KEY: process.env.WOOVI_WEBHOOK_PUBLIC_KEY,
    PAYMENTS_ENABLED: process.env.PAYMENTS_ENABLED,
    WOOVI_ENABLED: process.env.WOOVI_ENABLED,
    WOOVI_SPLIT_ENABLED: process.env.WOOVI_SPLIT_ENABLED,
    WOOVI_SUBACCOUNTS_ENABLED: process.env.WOOVI_SUBACCOUNTS_ENABLED,
    WITHDRAWALS_ENABLED: process.env.WITHDRAWALS_ENABLED,
    KYC_ENABLED: process.env.KYC_ENABLED,
  });
}

export type ServerEnv = ReturnType<typeof getServerEnv>;
