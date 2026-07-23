'use client';
import { createBrowserClient } from '@supabase/ssr';
import { publicEnv } from '@/env';

/** Cliente Supabase para o navegador (chave ANON, sujeito a RLS). */
export function createSupabaseBrowserClient() {
  return createBrowserClient(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}
