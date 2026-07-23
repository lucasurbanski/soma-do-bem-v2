'use client';
import Link from 'next/link';
import { useActionState } from 'react';
import { registerAction, type AuthState } from './actions';

export function RegisterForm() {
  const [state, action, pending] = useActionState<AuthState, FormData>(registerAction, {});

  return (
    <form action={action} className="space-y-4" noValidate>
      <div>
        <label className="label" htmlFor="fullName">
          Nome completo
        </label>
        <input id="fullName" name="fullName" required autoComplete="name" className="input" placeholder="Seu nome" />
      </div>
      <div>
        <label className="label" htmlFor="email">
          E-mail
        </label>
        <input id="email" name="email" type="email" required autoComplete="email" className="input" placeholder="seuemail@exemplo.com" />
      </div>
      <div>
        <label className="label" htmlFor="password">
          Senha
        </label>
        <input id="password" name="password" type="password" required autoComplete="new-password" className="input" placeholder="Mínimo de 8 caracteres" />
      </div>

      <label className="flex items-start gap-2 text-sm text-ink-muted">
        <input type="checkbox" name="acceptTerms" className="mt-0.5" />
        <span>
          Li e aceito os{' '}
          <Link href="/termos-de-uso" className="text-brand-600 underline">
            Termos de Uso
          </Link>{' '}
          e a{' '}
          <Link href="/politica-de-privacidade" className="text-brand-600 underline">
            Política de Privacidade
          </Link>
          .
        </span>
      </label>

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
        {pending ? 'Criando conta…' : 'Criar conta'}
      </button>

      <p className="text-center text-sm text-ink-soft">
        Já tem conta?{' '}
        <Link href="/login" className="font-semibold text-brand-600">
          Entrar
        </Link>
      </p>
    </form>
  );
}
