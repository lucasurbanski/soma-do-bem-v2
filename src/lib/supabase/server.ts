import 'server-only';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { publicEnv } from '@/env';

/**
 * Cliente Supabase para Server Components / Server Actions / Route Handlers.
 * Usa a chave ANON + sessão do usuário (via cookies) — sujeito a RLS.
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  return createServerClient(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // chamado de um Server Component: a escrita de cookie é ignorada
            // (o refresh de sessão acontece no middleware).
          }
        },
      },
    },
  );
}
