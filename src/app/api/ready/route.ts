import { NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Readiness: dependências (banco) acessíveis. */
export async function GET() {
  try {
    const admin = createSupabaseAdminClient();
    const { error } = await admin.from('feature_flags').select('key').limit(1);
    if (error) throw error;
    return NextResponse.json({ status: 'ready', db: 'ok' });
  } catch {
    return NextResponse.json({ status: 'degraded', db: 'error' }, { status: 503 });
  }
}
