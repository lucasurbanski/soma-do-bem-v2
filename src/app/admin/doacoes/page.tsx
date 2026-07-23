import { requireStaff } from '@/features/auth/session';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { formatBRL } from '@/lib/money';
import { AdminPageHeader, DataTable } from '@/components/admin/DataTable';

export const dynamic = 'force-dynamic';

export default async function AdminDoacoes() {
  await requireStaff();
  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from('donations')
    .select('id, donor_name, is_anonymous, amount_cents, status, provider, created_at')
    .order('created_at', { ascending: false })
    .limit(100);

  return (
    <div>
      <AdminPageHeader title="Doações" subtitle="Doações (mock) recebidas pela plataforma." />
      <DataTable
        columns={['ID', 'Doador', 'Valor', 'Status', 'Provedor', 'Data']}
        rows={(data ?? []).map((d) => [
          d.id.slice(0, 8),
          d.is_anonymous ? 'Anônimo' : (d.donor_name ?? '—'),
          formatBRL(Number(d.amount_cents)),
          d.status,
          d.provider,
          new Date(d.created_at).toLocaleString('pt-BR'),
        ])}
      />
    </div>
  );
}
