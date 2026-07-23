import { requireStaff } from '@/features/auth/session';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { formatBRL } from '@/lib/money';
import { AdminPageHeader, DataTable } from '@/components/admin/DataTable';

export const dynamic = 'force-dynamic';

export default async function AdminLedger() {
  await requireStaff();
  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from('ledger_entries')
    .select('id, account, entry_type, direction, amount_cents, campaign_id, created_at')
    .order('created_at', { ascending: false })
    .limit(200);

  return (
    <div>
      <AdminPageHeader
        title="Ledger financeiro"
        subtitle="Livro-razão imutável — fonte oficial de saldo. Correções só por lançamentos compensatórios."
      />
      <DataTable
        columns={['Conta', 'Tipo', 'Dir.', 'Valor', 'Vaquinha', 'Data']}
        rows={(data ?? []).map((e) => [
          e.account,
          e.entry_type,
          e.direction > 0 ? '+' : '−',
          formatBRL(Number(e.amount_cents)),
          e.campaign_id ? e.campaign_id.slice(0, 8) : '—',
          new Date(e.created_at).toLocaleString('pt-BR'),
        ])}
        empty="Nenhum lançamento ainda."
      />
    </div>
  );
}
