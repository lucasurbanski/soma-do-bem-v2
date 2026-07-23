# Apoie Aqui (Soma do Bem)

Plataforma brasileira de vaquinhas online. Reconstrução em **Next.js (App Router) + Supabase**, como **monólito modular**, com foco em **segurança**, **integridade financeira** e escalabilidade.

> **Fase atual:** MVP funcional **sem pagamento real**. Toda a camada de pagamentos roda por um
> `MockPaymentProvider`. Pagamentos reais, saques, split, subcontas e KYC ficam **desativados por
> feature flag** — apenas preparados e documentados.

## Stack

- **Next.js 15** (App Router) · **React 19** · **TypeScript** (strict)
- **Supabase**: PostgreSQL + Auth + Storage + **Row Level Security**
- **Tailwind CSS** · **Zod** (validação) · **Vitest** (unit) · **Playwright** (e2e)
- Dinheiro sempre em **centavos inteiros**. Regras financeiras 100% no servidor.

## Pré-requisitos

- Node 20.9+ (testado em Node 24) e npm
- Um projeto **Supabase** (dev na nuvem) — sem Docker necessário nesta máquina

## Começando

```bash
# 1. Dependências
npm install

# 2. Variáveis de ambiente
cp .env.example .env.local
#   preencha NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
#   SUPABASE_SERVICE_ROLE_KEY e DATABASE_URL (nunca versione .env.local)

# 3. Migrations (schema + RLS + functions + config) no banco
node --env-file=.env.local scripts/db-migrate.mjs

# 4. Seed de demonstração (bucket + usuários + vaquinhas)
node --env-file=.env.local scripts/seed.mjs

# 5. Rodar
npm run dev            # http://localhost:3000
```

### Usuários demo (DEV, criados pelo seed)

| Papel | E-mail | Senha |
|---|---|---|
| Admin | `admin@apoieaqui.dev` | `Admin!2026dev` |
| Organizador | `organizador@apoieaqui.dev` | `Org!2026dev` |
| Doador | `doador@apoieaqui.dev` | `Doa!2026dev` |

## Scripts

| Comando | Descrição |
|---|---|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Build de produção |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript (`tsc --noEmit`) |
| `npm run test` | Testes unitários (Vitest) |
| `npm run test:e2e` | Testes Playwright (requer `npx playwright install`) |
| `node --env-file=.env.local scripts/db-migrate.mjs` | Aplica migrations |
| `node --env-file=.env.local scripts/seed.mjs` | Semeia dados de demonstração |
| `node --env-file=.env.local scripts/smoke-e2e.mjs` | Prova o núcleo financeiro no banco real |

## Fluxo do MVP

Visitante navega → cadastro → onboarding do organizador → cria vaquinha (etapas) → envia para
análise → **admin aprova** → vaquinha fica pública → visitante contribui (**mock**) → cobrança Pix
mock → **confirmação via webhook** (`/api/webhooks/mock`, idempotente) → **ledger** recebe os
lançamentos → progresso e saldo atualizados. Em dev há um botão "Simular confirmação".

## Segurança (destaques)

- Autorização **server-side** + **RLS** em todas as tabelas (negar por padrão).
- **Service role nunca vai ao browser**; escritas financeiras só via servidor.
- **Ledger imutável** (sem UPDATE/DELETE) como fonte oficial de saldo; `raised_amount_cents` é só cache.
- **Idempotência** de webhook por índices únicos (evento + lançamento) — resiste a duplicatas e concorrência.
- Validação Zod, rate limiting, security headers (CSP/HSTS/etc.), upload validado, mascaramento de CPF, logs sem dados sensíveis.
- Detalhes em [`docs/06-security-and-privacy.md`](docs/06-security-and-privacy.md).

## Documentação

Auditoria e produto: [`00`](docs/00-legacy-inventory.md) · [`01`](docs/01-legacy-product-audit.md) · [`02`](docs/02-screen-map.md) · [`03`](docs/03-product-rationale.md)
Técnico: [`04 Arquitetura`](docs/04-architecture.md) · [`05 Modelo de dados`](docs/05-domain-model.md) · [`06 Segurança`](docs/06-security-and-privacy.md) · [`07 Pagamentos`](docs/07-payment-architecture.md) · [`08 Roadmap`](docs/08-implementation-roadmap.md) · [`09 Woovi`](docs/09-woovi-readiness.md) · [`10 Deploy`](docs/10-deployment.md) · [`11 Decisões em aberto`](docs/11-open-decisions.md)

## Estado atual

✅ Build, lint, typecheck e testes passando · ✅ Migrations + RLS aplicadas · ✅ Fluxo mock ponta a ponta
🚫 Pagamentos reais, saques, split, subcontas, KYC — **desativados** (feature flags).

Ver `docs/08-implementation-roadmap.md` para as próximas fases.
