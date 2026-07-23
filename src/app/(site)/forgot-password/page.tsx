import type { Metadata } from 'next';
import { ForgotForm } from '@/features/auth/ForgotForm';

export const metadata: Metadata = { title: 'Recuperar acesso' };

export default function ForgotPage() {
  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <div className="card p-8">
        <h1 className="mb-1 text-2xl font-bold text-ink">Recuperar acesso</h1>
        <p className="mb-6 text-sm text-ink-soft">
          Informe seu e-mail e enviaremos as instruções de recuperação.
        </p>
        <ForgotForm />
      </div>
    </div>
  );
}
