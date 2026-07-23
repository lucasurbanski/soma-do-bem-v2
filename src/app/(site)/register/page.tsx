import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { RegisterForm } from '@/features/auth/RegisterForm';
import { getSessionUser } from '@/features/auth/session';

export const metadata: Metadata = { title: 'Criar conta' };

export default async function RegisterPage() {
  const user = await getSessionUser();
  if (user) redirect('/painel');

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <div className="card p-8">
        <h1 className="mb-1 text-2xl font-bold text-ink">Criar sua conta</h1>
        <p className="mb-6 text-sm text-ink-soft">Leva menos de um minuto.</p>
        <RegisterForm />
      </div>
    </div>
  );
}
