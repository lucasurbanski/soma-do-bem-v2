'use client';
import Link from 'next/link';
import { useActionState } from 'react';
import { forgotPasswordAction, type AuthState } from './actions';

export function ForgotForm() {
  const [state, action, pending] = useActionState<AuthState, FormData>(forgotPasswordAction, {});
  return (
    <form action={action} className="space-y-4" noValidate>
      <div>
        <label className="label" htmlFor="email">
          E-mail
        </label>
        <input id="email" name="email" type="email" required className="input" placeholder="seuemail@exemplo.com" />
      </div>
      {state.error && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}
      {state.info && (
        <p role="status" className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
          {state.info}
        </p>
      )}
      <button type="submit" className="btn-primary w-full py-3" disabled={pending}>
        {pending ? 'Enviando…' : 'Enviar instruções'}
      </button>
      <p className="text-center text-sm text-ink-soft">
        <Link href="/login" className="font-semibold text-brand-600">
          Voltar para o login
        </Link>
      </p>
    </form>
  );
}
