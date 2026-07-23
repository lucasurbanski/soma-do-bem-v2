import { requireStaff } from '@/features/auth/session';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { formatBRL } from '@/lib/money';

export const dynamic = 'force-dynamic';

export default async function AdminOverview() {
  await requireStaff();
  const admin = createSupabaseAdminClient();

  const [pending, active, paidDonations, ledger] = await Promise.all([
    admin.from('campaigns').select('id', { count: 'exact', head: true }).eq('status', 'pending_review'),
    admin.from('campaigns').select('id', { count: 'exact', head: true }).eq('status', 'active'),
    admin.from('donations').select('id', { count: 'exact', head: true }).eq('status', 'paid'),
    admin.from('ledger_entries').select('amount_cents, entry_type').eq('entry_type', 'platform_fee'),
  ]);

  const platformRevenue = (ledger.data ?? []).reduce((s, e) => s + Number(e.amount_cents), 0);

  const cards = [
    { label: 'Em análise', value: pending.count ?? 0, accent: true },
    { label: 'Vaquinhas ativas', value: active.count ?? 0 },
    { label: 'Doações pagas', value: paidDonations.count ?? 0 },
    { label: 'Receita da plataforma (taxas)', value: formatBRL(platformRevenue) },
  ];

  return (
    <div>
      <h1 className="mb-1 text-xl font-bold text-ink">Visão geral</h1>
      <p className="mb-6 text-sm text-ink-soft">Resumo consolidado da plataforma (dados reais do banco).</p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className={`card p-5 ${c.accent ? 'border-brand-300' : ''}`}>
            <p className="text-xs uppercase tracking-wide text-ink-soft">{c.label}</p>
            <p className={`mt-1 text-2xl font-extrabold ${c.accent ? 'text-brand-600' : 'text-ink'}`}>
              {c.value}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
