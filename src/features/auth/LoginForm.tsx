'use client';
import Link from 'next/link';
import { useActionState } from 'react';
import { loginAction, type AuthState } from './actions';

export function LoginForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(loginAction, {});

  return (
    <form action={action} className="space-y-4" noValidate>
      {next && <input type="hidden" name="next" value={next} />}
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
        <input id="password" name="password" type="password" required autoComplete="current-password" className="input" placeholder="Digite sua senha" />
      </div>

      {state.error && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}

      <button type="submit" className="btn-primary w-full py-3" disabled={pending}>
        {pending ? 'Entrando…' : 'Entrar'}
      </button>

      <div className="flex items-center justify-between text-sm">
        <Link href="/forgot-password" className="text-ink-soft hover:text-brand-600">
          Esqueci minha senha
        </Link>
        <Link href="/register" className="font-semibold text-brand-600">
          Criar conta
        </Link>
      </div>
    </form>
  );
}
