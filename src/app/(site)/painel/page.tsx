import type { Metadata } from 'next';
import Link from 'next/link';
import { requireUser } from '@/features/auth/session';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Meu painel' };
export const dynamic = 'force-dynamic';

export default async function PainelPage() {
  const user = await requireUser('/painel');
  const supabase = await createSupabaseServerClient();

  const [{ data: profile }, { count }] = await Promise.all([
    supabase.from('profiles').select('onboarding_status').eq('id', user.id).maybeSingle(),
    supabase.from('campaigns').select('id', { count: 'exact', head: true }).eq('organizer_id', user.id),
  ]);

  const onboardingDone = profile?.onboarding_status !== 'not_started';

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-2xl font-bold text-ink">Olá, {user.fullName?.split(' ')[0] ?? 'organizador'} 👋</h1>
      <p className="mt-1 text-ink-soft">Gerencie suas vaquinhas e acompanhe seus resultados.</p>

      {!onboardingDone && (
        <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm">
          Complete seu cadastro de organizador para poder publicar vaquinhas.{' '}
          <Link href="/onboarding" className="font-semibold text-brand-600">
            Concluir cadastro
          </Link>
        </div>
      )}

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <Link href="/painel/vaquinhas" className="card p-6 transition hover:shadow-lg">
          <p className="text-3xl font-extrabold text-brand-600">{count ?? 0}</p>
          <p className="text-sm text-ink-soft">Minhas vaquinhas</p>
        </Link>
        <Link href="/criar-vaquinha" className="card flex items-center p-6 transition hover:shadow-lg">
          <span className="font-semibold text-ink">+ Criar nova vaquinha</span>
        </Link>
        <div className="card p-6">
          <p className="text-sm font-semibold text-ink">Cadastro</p>
          <p className="text-sm text-ink-soft">
            {onboardingDone ? 'Concluído ✅' : 'Pendente'}
          </p>
        </div>
      </div>
    </div>
  );
}
