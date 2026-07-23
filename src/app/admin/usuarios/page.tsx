import { requireStaff } from '@/features/auth/session';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { AdminPageHeader, DataTable } from '@/components/admin/DataTable';

export const dynamic = 'force-dynamic';

export default async function AdminUsuarios() {
  await requireStaff();
  const admin = createSupabaseAdminClient();
  const { data: profiles } = await admin
    .from('profiles')
    .select('id, full_name, onboarding_status, is_suspended, created_at')
    .order('created_at', { ascending: false })
    .limit(100);

  const { data: roles } = await admin.from('user_roles').select('user_id, role');
  const roleMap = new Map<string, string[]>();
  (roles ?? []).forEach((r) => {
    roleMap.set(r.user_id, [...(roleMap.get(r.user_id) ?? []), r.role]);
  });

  return (
    <div>
      <AdminPageHeader title="Usuários" subtitle="Organizadores e doadores cadastrados. CPF/e-mail não são exibidos." />
      <DataTable
        columns={['Nome', 'Papéis', 'Onboarding', 'Status', 'Cadastro']}
        rows={(profiles ?? []).map((p) => [
          p.full_name ?? '—',
          (roleMap.get(p.id) ?? ['donor']).join(', '),
          p.onboarding_status,
          p.is_suspended ? 'Suspenso' : 'Ativo',
          new Date(p.created_at).toLocaleDateString('pt-BR'),
        ])}
      />
    </div>
  );
}
