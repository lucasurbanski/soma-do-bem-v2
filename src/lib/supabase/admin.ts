import 'server-only';
import { createClient } from '@supabase/supabase-js';
import { publicEnv } from '@/env';
import { getServerEnv } from '@/env';

/**
 * Cliente ADMIN (service role) — IGNORA RLS. Uso EXCLUSIVO server-side para
 * operações privilegiadas: webhook, criação de doação/cobrança, moderação,
 * lançamentos do ledger. NUNCA exponha este cliente ao browser.
 *
 * Toda escrita financeira/privilegiada passa por aqui + auditoria.
 */
export function createSupabaseAdminClient() {
  const env = getServerEnv();
  return createClient(publicEnv.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
