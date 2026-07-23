'use client';
import { useActionState } from 'react';
import { saveOnboarding, type OnboardingState } from './actions';

export function OnboardingForm() {
  const [state, action, pending] = useActionState<OnboardingState, FormData>(saveOnboarding, {});

  return (
    <form action={action} className="space-y-6" noValidate>
      <fieldset className="card space-y-4 p-6">
        <legend className="px-1 text-sm font-bold text-ink">Dados pessoais</legend>
        <div>
          <label className="label" htmlFor="legalName">
            Nome completo
          </label>
          <input id="legalName" name="legalName" required className="input" autoComplete="name" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="cpf">
              CPF
            </label>
            <input id="cpf" name="cpf" required className="input" placeholder="000.000.000-00" inputMode="numeric" />
          </div>
          <div>
            <label className="label" htmlFor="birthDate">
              Data de nascimento
            </label>
            <input id="birthDate" name="birthDate" type="date" required className="input" />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="phone">
            WhatsApp / Telefone
          </label>
          <input id="phone" name="phone" required className="input" placeholder="(00) 00000-0000" inputMode="tel" />
        </div>
      </fieldset>

      <fieldset className="card space-y-4 p-6">
        <legend className="px-1 text-sm font-bold text-ink">Endereço</legend>
        <div className="grid gap-4 sm:grid-cols-[140px_1fr]">
          <div>
            <label className="label" htmlFor="postalCode">
              CEP
            </label>
            <input id="postalCode" name="postalCode" className="input" placeholder="00000-000" inputMode="numeric" />
          </div>
          <div>
            <label className="label" htmlFor="street">
              Rua
            </label>
            <input id="street" name="street" className="input" />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="label" htmlFor="number">
              Número
            </label>
            <input id="number" name="number" className="input" />
          </div>
          <div>
            <label className="label" htmlFor="district">
              Bairro
            </label>
            <input id="district" name="district" className="input" />
          </div>
          <div>
            <label className="label" htmlFor="city">
              Cidade
            </label>
            <input id="city" name="city" className="input" />
          </div>
        </div>
        <div className="w-24">
          <label className="label" htmlFor="stateUf">
            UF
          </label>
          <input id="stateUf" name="stateUf" maxLength={2} className="input uppercase" />
        </div>
      </fieldset>

      <label className="flex items-start gap-2 text-sm text-ink-muted">
        <input type="checkbox" name="ownership" className="mt-0.5" />
        <span>
          Declaro que sou titular/responsável pelos recursos arrecadados ou possuo vínculo e
          autorização do beneficiário, e que os dados informados são verdadeiros.
        </span>
      </label>

      <p className="text-xs text-ink-soft">
        🔒 Não pedimos dados bancários agora. Eles só serão solicitados quando o saque estiver
        disponível. Seu CPF é armazenado de forma protegida e nunca é exibido publicamente.
      </p>

      {state.error && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}

      <div className="flex justify-end">
        <button type="submit" className="btn-primary px-8 py-3" disabled={pending}>
          {pending ? 'Salvando…' : 'Concluir cadastro'}
        </button>
      </div>
    </form>
  );
}
