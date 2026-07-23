'use client';
import { useActionState } from 'react';
import { submitReport, type ReportState } from './actions';

export function ReportForm({ causeId }: { causeId: string }) {
  const [state, action, pending] = useActionState<ReportState, FormData>(submitReport, {});

  if (state.ok) {
    return (
      <div className="card p-6 text-center">
        <p className="text-3xl">✅</p>
        <p className="mt-2 font-semibold text-ink">Denúncia registrada.</p>
        <p className="text-sm text-ink-soft">Nossa equipe irá analisar. Obrigado por ajudar.</p>
      </div>
    );
  }

  return (
    <form action={action} className="card space-y-4 p-6" noValidate>
      <input type="hidden" name="causeId" value={causeId} />
      <div>
        <label className="label" htmlFor="reason">
          Motivo da denúncia
        </label>
        <input id="reason" name="reason" required className="input" placeholder="Ex.: informação enganosa" />
      </div>
      <div>
        <label className="label" htmlFor="details">
          Detalhes (opcional)
        </label>
        <textarea id="details" name="details" rows={4} className="input" />
      </div>
      <div>
        <label className="label" htmlFor="email">
          Seu e-mail (opcional)
        </label>
        <input id="email" name="email" type="email" className="input" placeholder="Para retorno, se necessário" />
      </div>
      {state.error && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}
      <button type="submit" className="btn-primary" disabled={pending}>
        {pending ? 'Enviando…' : 'Enviar denúncia'}
      </button>
    </form>
  );
}
