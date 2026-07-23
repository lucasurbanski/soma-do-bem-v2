'use client';
import { useActionState } from 'react';
import { createMockDonation, type DonationState } from './actions';

export function DonationForm({ causeId, causeTitle }: { causeId: string; causeTitle: string }) {
  const [state, action, pending] = useActionState<DonationState, FormData>(createMockDonation, {});

  return (
    <form action={action} className="space-y-5" noValidate>
      <input type="hidden" name="causeId" value={causeId} />

      <div className="rounded-lg bg-brand-50 px-4 py-3 text-sm text-ink-muted">
        Você está ajudando a vaquinha <strong className="text-ink">{causeTitle}</strong>.
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="amount">
            Valor da doação (R$)
          </label>
          <input id="amount" name="amount" required inputMode="decimal" className="input" placeholder="0,00" />
        </div>
        <div>
          <label className="label" htmlFor="name">
            Nome completo
          </label>
          <input id="name" name="name" required className="input" placeholder="Digite aqui" />
        </div>
        <div>
          <label className="label" htmlFor="email">
            E-mail
          </label>
          <input id="email" name="email" type="email" required className="input" placeholder="Digite aqui" />
        </div>
        <div>
          <label className="label" htmlFor="message">
            Mensagem (opcional)
          </label>
          <input id="message" name="message" className="input" placeholder="Deixe uma mensagem de apoio" />
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm text-ink-muted">
        <input type="checkbox" name="anonymous" />
        Quero contribuir de forma anônima
      </label>

      <div className="rounded-lg border border-surface-line px-4 py-3">
        <p className="text-sm font-medium text-ink">Forma de pagamento</p>
        <p className="mt-1 inline-flex items-center gap-2 text-sm text-ink-muted">
          <span aria-hidden>🔷</span> Pix (ambiente de testes — sem cobrança real)
        </p>
      </div>

      <label className="flex items-start gap-2 text-xs text-ink-muted">
        <input type="checkbox" name="consent" className="mt-0.5" />
        <span>
          Declaro que sou maior de 18 anos e estou de acordo com os Termos, Taxas e Prazos.
        </span>
      </label>

      {state.error && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}

      <button type="submit" className="btn-primary w-full py-3 text-base" disabled={pending}>
        {pending ? 'Gerando cobrança…' : 'Contribuir'}
      </button>
    </form>
  );
}
