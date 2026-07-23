import 'server-only';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export type AppRole = 'donor' | 'organizer' | 'moderator' | 'admin' | 'financial_operator' | 'support';

const STAFF_ROLES: AppRole[] = ['admin', 'moderator', 'support', 'financial_operator'];

export interface SessionUser {
  id: string;
  email: string | null;
  fullName: string | null;
  roles: AppRole[];
}

/** Usuário atual (ou null). Sempre resolvido no servidor. */
export async function getSessionUser(): Promise<SessionUser | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: profile }, { data: roleRows }] = await Promise.all([
    supabase.from('profiles').select('full_name').eq('id', user.id).maybeSingle(),
    supabase.from('user_roles').select('role').eq('user_id', user.id),
  ]);

  return {
    id: user.id,
    email: user.email ?? null,
    fullName: profile?.full_name ?? null,
    roles: (roleRows ?? []).map((r) => r.role as AppRole),
  };
}

/** Exige usuário autenticado; redireciona para /login caso contrário. */
export async function requireUser(nextPath?: string): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) {
    redirect(`/login${nextPath ? `?next=${encodeURIComponent(nextPath)}` : ''}`);
  }
  return user;
}

export function hasRole(user: SessionUser, role: AppRole): boolean {
  return user.roles.includes(role);
}

export function isStaff(user: SessionUser): boolean {
  return user.roles.some((r) => STAFF_ROLES.includes(r));
}

/** Exige papel de staff (admin/moderator/support/financial_operator). */
export async function requireStaff(): Promise<SessionUser> {
  const user = await requireUser('/admin');
  if (!isStaff(user)) {
    redirect('/');
  }
  return user;
}

/** Exige papel de admin. */
export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser('/admin');
  if (!hasRole(user, 'admin')) {
    redirect('/');
  }
  return user;
}
