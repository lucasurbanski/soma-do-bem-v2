import { requireStaff } from '@/features/auth/session';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { formatBRL } from '@/lib/money';
import { AdminPageHeader, DataTable } from '@/components/admin/DataTable';
import { CAMPAIGN_STATUS_LABELS } from '@/features/campaigns/types';

export const dynamic = 'force-dynamic';

export default async function AdminVaquinhas() {
  await requireStaff();
  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from('campaigns')
    .select('id, title, status, goal_amount_cents, raised_amount_cents, city, state_uf, created_at')
    .order('created_at', { ascending: false })
    .limit(100);

  return (
    <div>
      <AdminPageHeader title="Vaquinhas" subtitle="Todas as campanhas do sistema." />
      <DataTable
        columns={['Título', 'Status', 'Meta', 'Arrecadado', 'Local', 'Criada']}
        rows={(data ?? []).map((c) => [
          c.title,
          CAMPAIGN_STATUS_LABELS[c.status] ?? c.status,
          formatBRL(Number(c.goal_amount_cents)),
          formatBRL(Number(c.raised_amount_cents)),
          [c.city, c.state_uf].filter(Boolean).join('/') || '—',
          new Date(c.created_at).toLocaleDateString('pt-BR'),
        ])}
      />
    </div>
  );
}
