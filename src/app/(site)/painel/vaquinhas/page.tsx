import type { Metadata } from 'next';
import Link from 'next/link';
import { requireUser } from '@/features/auth/session';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { formatBRL } from '@/lib/money';
import { CAMPAIGN_STATUS_BADGE, CAMPAIGN_STATUS_LABELS } from '@/features/campaigns/types';

export const metadata: Metadata = { title: 'Minhas vaquinhas' };
export const dynamic = 'force-dynamic';

export default async function MinhasVaquinhasPage() {
  const user = await requireUser('/painel/vaquinhas');
  const supabase = await createSupabaseServerClient();
  const { data: campaigns } = await supabase
    .from('campaigns')
    .select('id, slug, title, status, goal_amount_cents, raised_amount_cents, created_at')
    .eq('organizer_id', user.id)
    .order('created_at', { ascending: false });

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-ink">Minhas vaquinhas</h1>
        <Link href="/criar-vaquinha" className="btn-primary">
          + Nova vaquinha
        </Link>
      </div>

      {campaigns && campaigns.length > 0 ? (
        <ul className="space-y-3">
          {campaigns.map((c) => (
            <li key={c.id}>
              <Link
                href={`/painel/vaquinhas/${c.id}`}
                className="card flex items-center justify-between p-5 transition hover:shadow-lg"
              >
                <div>
                  <p className="font-semibold text-ink">{c.title}</p>
                  <p className="text-sm text-ink-soft">
                    {formatBRL(Number(c.raised_amount_cents))} de {formatBRL(Number(c.goal_amount_cents))}
                  </p>
                </div>
                <span className={`badge ${CAMPAIGN_STATUS_BADGE[c.status] ?? ''}`}>
                  {CAMPAIGN_STATUS_LABELS[c.status] ?? c.status}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <div className="card p-10 text-center text-ink-soft">
          Você ainda não criou nenhuma vaquinha.{' '}
          <Link href="/criar-vaquinha" className="font-semibold text-brand-600">
            Criar a primeira
          </Link>
        </div>
      )}
    </div>
  );
}
