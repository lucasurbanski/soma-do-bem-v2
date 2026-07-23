import { requireStaff } from '@/features/auth/session';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { AdminPageHeader, DataTable } from '@/components/admin/DataTable';

export const dynamic = 'force-dynamic';

export default async function AdminAuditoria() {
  await requireStaff();
  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from('audit_logs')
    .select('id, action, entity_type, entity_id, actor_id, created_at')
    .order('created_at', { ascending: false })
    .limit(200);

  return (
    <div>
      <AdminPageHeader title="Trilha de auditoria" subtitle="Ações sensíveis registradas no sistema." />
      <DataTable
        columns={['Ação', 'Entidade', 'Ref.', 'Ator', 'Data']}
        rows={(data ?? []).map((a) => [
          a.action,
          a.entity_type,
          a.entity_id ? String(a.entity_id).slice(0, 8) : '—',
          a.actor_id ? String(a.actor_id).slice(0, 8) : 'sistema',
          new Date(a.created_at).toLocaleString('pt-BR'),
        ])}
      />
    </div>
  );
}
