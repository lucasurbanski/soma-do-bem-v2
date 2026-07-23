import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { LoginForm } from '@/features/auth/LoginForm';
import { getSessionUser } from '@/features/auth/session';

export const metadata: Metadata = { title: 'Entrar' };

type SP = Promise<{ next?: string }>;

export default async function LoginPage({ searchParams }: { searchParams: SP }) {
  const { next } = await searchParams;
  const user = await getSessionUser();
  if (user) redirect(next && next.startsWith('/') ? next : '/painel');

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <div className="card p-8">
        <h1 className="mb-1 text-2xl font-bold text-ink">Olá, bem-vindo(a)!</h1>
        <p className="mb-6 text-sm text-ink-soft">Acesse sua conta para continuar.</p>
        <LoginForm next={next} />
      </div>
    </div>
  );
}
