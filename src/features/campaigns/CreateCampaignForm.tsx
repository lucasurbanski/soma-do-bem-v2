'use client';
import { useActionState, useState } from 'react';
import { createCampaignDraft, type CampaignFormState } from './actions';
import type { Category } from './queries';

const UFS = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];

export function CreateCampaignForm({ categories }: { categories: Category[] }) {
  const [state, action, pending] = useActionState<CampaignFormState, FormData>(
    createCampaignDraft,
    {},
  );
  const [kind, setKind] = useState<'self' | 'third_party'>('self');

  return (
    <form action={action} className="space-y-8" noValidate>
      <Section n={1} title="Informações básicas e categoria">
        <div>
          <label className="label" htmlFor="title">
            Título da vaquinha
          </label>
          <input id="title" name="title" required className="input" placeholder="Ex.: Ajude o tratamento da Maria" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="categorySlug">
              Categoria
            </label>
            <select id="categorySlug" name="categorySlug" required className="input">
              <option value="">Selecione…</option>
              {categories.map((c) => (
                <option key={c.id} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="goal">
              Meta (R$)
            </label>
            <input id="goal" name="goal" required inputMode="decimal" className="input" placeholder="Ex.: 5.000,00" />
          </div>
        </div>
      </Section>

      <Section n={2} title="Localização">
        <div className="grid gap-4 sm:grid-cols-[1fr_120px]">
          <div>
            <label className="label" htmlFor="city">
              Cidade
            </label>
            <input id="city" name="city" className="input" placeholder="Ex.: Joinville" />
          </div>
          <div>
            <label className="label" htmlFor="stateUf">
              UF
            </label>
            <select id="stateUf" name="stateUf" className="input">
              <option value="">—</option>
              {UFS.map((uf) => (
                <option key={uf} value={uf}>
                  {uf}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Section>

      <Section n={3} title="A história">
        <label className="label" htmlFor="story">
          Conte a história da sua vaquinha
        </label>
        <textarea
          id="story"
          name="story"
          rows={8}
          className="input"
          placeholder="Explique quem é beneficiado, por que você precisa de ajuda e como o valor será usado."
        />
      </Section>

      <Section n={4} title="Beneficiário">
        <div className="flex gap-4">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="beneficiaryKind"
              value="self"
              checked={kind === 'self'}
              onChange={() => setKind('self')}
            />
            Sou eu o beneficiário
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="beneficiaryKind"
              value="third_party"
              checked={kind === 'third_party'}
              onChange={() => setKind('third_party')}
            />
            É outra pessoa
          </label>
        </div>
        {kind === 'third_party' && (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="beneficiaryName">
                Nome do beneficiário
              </label>
              <input id="beneficiaryName" name="beneficiaryName" className="input" />
            </div>
            <div>
              <label className="label" htmlFor="beneficiaryRelationship">
                Seu vínculo com o beneficiário
              </label>
              <input id="beneficiaryRelationship" name="beneficiaryRelationship" className="input" placeholder="Ex.: mãe, amigo, responsável" />
            </div>
          </div>
        )}
        <p className="mt-3 text-xs text-ink-soft">
          Declaro que as informações são verdadeiras e que tenho vínculo/autorização com o
          beneficiário indicado. A imagem de capa poderá ser adicionada na etapa de edição.
        </p>
      </Section>

      {state.error && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}

      <div className="flex justify-end">
        <button type="submit" className="btn-primary px-8 py-3" disabled={pending}>
          {pending ? 'Salvando…' : 'Salvar e continuar'}
        </button>
      </div>
    </form>
  );
}

function Section({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <fieldset className="card p-6">
      <legend className="mb-4 flex items-center gap-2 px-1 text-sm font-bold text-ink">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-500 text-xs text-white">
          {n}
        </span>
        {title}
      </legend>
      <div className="space-y-4">{children}</div>
    </fieldset>
  );
}
