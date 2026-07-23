import { requireStaff } from '@/features/auth/session';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { AdminPageHeader, DataTable } from '@/components/admin/DataTable';

export const dynamic = 'force-dynamic';

export default async function AdminDenuncias() {
  await requireStaff();
  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from('campaign_reports')
    .select('id, campaign_id, reason, status, created_at')
    .order('created_at', { ascending: false })
    .limit(100);

  return (
    <div>
      <AdminPageHeader title="Denúncias" subtitle="Denúncias de vaquinhas enviadas por usuários." />
      <DataTable
        columns={['Vaquinha', 'Motivo', 'Status', 'Data']}
        rows={(data ?? []).map((r) => [
          r.campaign_id.slice(0, 8),
          r.reason,
          r.status,
          new Date(r.created_at).toLocaleString('pt-BR'),
        ])}
        empty="Nenhuma denúncia."
      />
    </div>
  );
}
