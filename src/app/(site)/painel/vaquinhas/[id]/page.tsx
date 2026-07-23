import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireUser } from '@/features/auth/session';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { formatBRL } from '@/lib/money';
import { isEnabled } from '@/lib/feature-flags';
import { submitForReview } from '@/features/campaigns/actions';
import { CAMPAIGN_STATUS_BADGE, CAMPAIGN_STATUS_LABELS } from '@/features/campaigns/types';

export const metadata: Metadata = { title: 'Detalhe da vaquinha' };
export const dynamic = 'force-dynamic';

type Params = Promise<{ id: string }>;

export default async function OrganizerCampaignPage({ params }: { params: Params }) {
  const { id } = await params;
  const user = await requireUser('/painel/vaquinhas');
  const supabase = await createSupabaseServerClient();

  const { data: campaign } = await supabase
    .from('campaigns')
    .select('id, slug, title, status, story, goal_amount_cents, raised_amount_cents, rejection_reason, organizer_id')
    .eq('id', id)
    .maybeSingle();

  if (!campaign || campaign.organizer_id !== user.id) notFound();

  const { data: balanceRows } = await supabase.rpc('my_campaign_balance', { p_campaign_id: id });
  const balance = Array.isArray(balanceRows) ? balanceRows[0] : balanceRows;

  const withdrawalsEnabled = isEnabled('WITHDRAWALS_ENABLED');
  const canSubmit = ['draft', 'rejected'].includes(campaign.status);
  const submit = submitForReview.bind(null, id);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <Link href="/painel/vaquinhas" className="text-sm text-ink-soft hover:text-brand-600">
        ← Minhas vaquinhas
      </Link>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-ink">{campaign.title}</h1>
        <span className={`badge ${CAMPAIGN_STATUS_BADGE[campaign.status] ?? ''}`}>
          {CAMPAIGN_STATUS_LABELS[campaign.status] ?? campaign.status}
        </span>
      </div>

      {campaign.status === 'rejected' && campaign.rejection_reason && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <strong>Motivo da rejeição:</strong> {campaign.rejection_reason}
        </div>
      )}

      {/* Saldo (fonte: ledger) */}
      <section className="mt-6 grid gap-4 sm:grid-cols-3">
        <BalanceCard label="Arrecadado (bruto)" cents={Number(balance?.raised_gross_cents ?? 0)} />
        <BalanceCard label="Saldo pendente" cents={Number(balance?.pending_cents ?? 0)} />
        <BalanceCard label="Saldo disponível" cents={Number(balance?.available_cents ?? 0)} highlight />
      </section>
      <p className="mt-2 text-xs text-ink-soft">
        Valores oficiais calculados a partir do ledger financeiro (não do cache da campanha).
      </p>

      {/* Ações de status */}
      {canSubmit && (
        <form action={submit} className="mt-6">
          <button type="submit" className="btn-primary">
            Enviar para análise
          </button>
          <p className="mt-2 text-xs text-ink-soft">
            Ao enviar, sua vaquinha entra na fila de moderação. Complete título, categoria, meta e
            história.
          </p>
        </form>
      )}

      {campaign.status === 'active' && (
        <div className="mt-6">
          <Link href={`/causes/${campaign.slug}`} className="btn-outline">
            Ver página pública
          </Link>
        </div>
      )}

      {/* Saque (desativado) */}
      <section className="card mt-8 p-6">
        <h2 className="text-lg font-bold text-ink">Saque</h2>
        {withdrawalsEnabled ? (
          <p className="mt-2 text-sm text-ink-muted">Solicitação de saque disponível.</p>
        ) : (
          <div className="mt-2 rounded-lg bg-surface-warm px-4 py-3 text-sm text-ink-muted">
            🔒 A funcionalidade de saque está <strong>desativada</strong> nesta fase (pagamentos
            reais desabilitados). Quando ativada, você poderá solicitar o saque do saldo disponível,
            informando seus dados bancários com segurança.
          </div>
        )}
      </section>
    </div>
  );
}

function BalanceCard({ label, cents, highlight }: { label: string; cents: number; highlight?: boolean }) {
  return (
    <div className={`card p-5 ${highlight ? 'border-brand-300' : ''}`}>
      <p className="text-xs uppercase tracking-wide text-ink-soft">{label}</p>
      <p className={`mt-1 text-xl font-extrabold ${highlight ? 'text-brand-600' : 'text-ink'}`}>
        {formatBRL(cents)}
      </p>
    </div>
  );
}
