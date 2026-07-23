# CLAUDE.md — Guia para agentes de código

Contexto para quem for continuar este projeto (humano ou IA). Leia antes de editar.

## O que é

**Apoie Aqui** (marca) / **Soma do Bem** (entidade, Joinville/SC) — plataforma de vaquinhas online.
Monólito modular **Next.js App Router + Supabase**. Textos de UI em **pt-BR**; código e identificadores em **inglês**.

## Regras invioláveis

1. **Dinheiro em centavos inteiros.** Nunca float para valores monetários. Use `src/lib/money.ts`.
2. **Regras financeiras só no servidor.** O frontend nunca decide valor/taxa/total nem marca doação como paga.
3. **Ledger é a fonte oficial de saldo.** `campaigns.raised_amount_cents` é cache derivado — nunca base de decisão financeira.
4. **Ledger é imutável.** Sem UPDATE/DELETE; correções por lançamentos compensatórios.
5. **Idempotência sempre.** Eventos financeiros usam chaves únicas (`payment_webhook_events (provider,event_id)`, `ledger_entries.idempotency_key`).
6. **Service role nunca no browser.** Só em `src/lib/supabase/admin.ts` e código `server-only`.
7. **RLS negando por padrão.** Nenhuma policy deixa usuário alterar saldo/pagamento/taxa/status financeiro.
8. **Segredos só em `.env.local`** (git-ignored). Nunca commitar chaves/tokens/senhas.
9. **Sem pagamento real nesta fase.** Flags `PAYMENTS_ENABLED`/`WOOVI_*`/`WITHDRAWALS_ENABLED`/`KYC_ENABLED` = `false`.
10. **Taxas vêm de config versionada** (`platform_fees`), nunca hardcoded na UI.

## Arquitetura em camadas (não misturar)

- **Interface:** `src/app/**`, `src/components/**`, `*Form.tsx` (client). Sem regra de negócio aqui.
- **Validação:** Zod na borda (Server Actions / Route Handlers).
- **Caso de uso:** `src/features/*/actions.ts` e lógica pura (`fees.ts`, `postings.ts`, `processor.ts`).
- **Dados:** `src/features/*/queries.ts`, `src/server/*`, clientes Supabase.
- **Integração externa:** `src/features/payments/*` (porta `PaymentProvider` + adaptadores Mock/Woovi).

## Onde está o quê

- Núcleo financeiro (puro, testado): `src/lib/money.ts`, `src/features/payments/fees.ts`, `src/features/ledger/*`, `src/features/webhooks/processor.ts`, `src/features/campaigns/slug.ts`.
- Provedores: `src/features/payments/{mock,woovi}-provider.ts`; fábrica em `index.ts`.
- Webhook real (banco): `src/server/webhook-handler.ts` + `webhook-repository.ts`; rota `src/app/api/webhooks/mock/route.ts`.
- Auth/sessão: `src/features/auth/session.ts` (`getSessionUser`, `requireUser`, `requireStaff`, `requireAdmin`).
- Banco: `supabase/migrations/*.sql` (schema, financeiro, plataforma, RLS, config, views, função `apply_donation_paid`).

## Fluxo de trabalho

```bash
# aplicar mudanças de schema: crie um novo arquivo supabase/migrations/00NN_*.sql (nunca edite os já aplicados)
node --env-file=.env.local scripts/db-migrate.mjs

# antes de considerar pronto:
npm run lint && npm run typecheck && npm run test && npm run build
node --env-file=.env.local scripts/smoke-e2e.mjs   # prova o núcleo financeiro no banco
```

- **Migrations são imutáveis depois de aplicadas** (registradas em `schema_migrations`). Mudança = nova migration.
- Toda ação sensível deve gravar `audit_logs` e, quando muda status, `campaign_status_history`.
- Novos testes ao lado do código (`*.test.ts`), rodados por Vitest.

## Convenções

- Componentes e páginas em português na UI; nomes de funções/variáveis em inglês.
- Server Actions retornam `{ error }`/`{ ok }` para formulários (via `useActionState`).
- Logs estruturados via `src/lib/logger.ts` (redige campos sensíveis automaticamente).
- Não introduzir microsserviços, filas externas nem float monetário.

## Pendências de negócio

Ver `docs/11-open-decisions.md` — taxas, prazos, KYC, split, responsável legal, promoções (corações/emojis/destaque).
