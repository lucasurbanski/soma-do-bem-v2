import Link from 'next/link';
import { requireStaff } from '@/features/auth/session';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { formatBRL } from '@/lib/money';
import { approveCampaign, rejectCampaign } from '@/features/moderation/actions';

export const dynamic = 'force-dynamic';

export default async function ModeracaoPage() {
  await requireStaff();
  const admin = createSupabaseAdminClient();
  const { data: campaigns } = await admin
    .from('campaigns')
    .select('id, slug, title, goal_amount_cents, city, state_uf, created_at, organizer_id')
    .eq('status', 'pending_review')
    .order('created_at', { ascending: true });

  return (
    <div>
      <h1 className="mb-1 text-xl font-bold text-ink">Fila de análise</h1>
      <p className="mb-6 text-sm text-ink-soft">
        {campaigns?.length ?? 0} vaquinha(s) aguardando moderação.
      </p>

      {campaigns && campaigns.length > 0 ? (
        <div className="space-y-4">
          {campaigns.map((c) => (
            <div key={c.id} className="card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-semibold text-ink">{c.title}</h2>
                  <p className="text-sm text-ink-soft">
                    Meta {formatBRL(Number(c.goal_amount_cents))}
                    {c.city ? ` · ${c.city}` : ''}
                    {c.state_uf ? `/${c.state_uf}` : ''}
                  </p>
                </div>
                <Link href={`/causes/${c.slug}`} className="btn-ghost" target="_blank">
                  Pré-visualizar
                </Link>
              </div>

              <div className="mt-4 flex flex-wrap items-end gap-3 border-t border-surface-line pt-4">
                <form action={approveCampaign}>
                  <input type="hidden" name="campaignId" value={c.id} />
                  <button type="submit" className="btn bg-green-600 text-white hover:bg-green-700">
                    Aprovar e publicar
                  </button>
                </form>

                <form action={rejectCampaign} className="flex items-end gap-2">
                  <input type="hidden" name="campaignId" value={c.id} />
                  <div>
                    <label className="label text-xs" htmlFor={`reason-${c.id}`}>
                      Motivo da rejeição
                    </label>
                    <input
                      id={`reason-${c.id}`}
                      name="reason"
                      required
                      className="input py-2"
                      placeholder="Explique o motivo"
                    />
                  </div>
                  <button type="submit" className="btn border border-red-300 text-red-600 hover:bg-red-50">
                    Rejeitar
                  </button>
                </form>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card p-10 text-center text-ink-soft">Nenhuma vaquinha na fila. 🎉</div>
      )}
    </div>
  );
}
