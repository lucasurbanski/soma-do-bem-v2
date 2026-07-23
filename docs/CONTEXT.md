# CONTEXT.md — Documentação viva do projeto Apoie Aqui

> **Este é o documento âncora do projeto.** Ele é atualizado a CADA alteração/movimento.
> Ao retomar o trabalho, leia este arquivo primeiro. O histórico de movimentos fica no fim.
>
> Regra para o agente/dev: **toda mudança significativa deve atualizar este arquivo** — a seção
> "Estado atual" e uma nova entrada no "Histórico de movimentos" (com data).

Última atualização: **2026-07-23**

---

## 1. Visão geral

- **Produto:** Apoie Aqui (marca) — plataforma de vaquinhas online (crowdfunding de doações por Pix).
- **Entidade:** Soma do Bem (empresa catarinense, Joinville/SC).
- **Objetivo do projeto:** reconstruir a plataforma do zero, com foco em **velocidade, segurança e escalabilidade**.
- **Fase atual:** MVP funcional **sem pagamento real** (tudo mock). Próximo: revisão página por página → regras de negócio → gateway → financeiro.

## 2. Como o trabalho está organizado (plano macro)

1. **Fase A — Estrutura de páginas** ✅ (feito): scaffold + todas as páginas navegáveis + fluxo mock ponta a ponta.
2. **Fase de refino (ATUAL): revisão página por página, funcionalidade por funcionalidade**, deixando o site "pronto".
3. **Fase B — Regras de negócio** (taxas, prazos, moderação, incentivos) — depois do refino.
4. **Fase C — Gateway de pagamento (Woovi) e processos financeiros reais** — por último, com sandbox → produção.

Sequência preferida pelo Lucas: **páginas → testar → banco → gateway**.

## 3. Stack e decisões-chave

- **Next.js 15 (App Router) + React 19 + TypeScript strict.**
- **Supabase**: PostgreSQL + Auth + Storage + **RLS**.
- **Tailwind, Zod, Vitest, Playwright, ESLint, Prettier.**
- **Monólito modular** (sem microsserviços/filas). Dinheiro em **centavos inteiros**.
- Arquitetura nova (não estender o site estático antigo). Visual/conteúdo do legado são referência.
- Detalhes: `docs/04-architecture.md`.

## 4. Ambientes e repositórios

- **Código local:** `C:\Users\lucas\documents\soma-do-bem` (git inicializado).
- **Repo GitHub (novo, destino):** `github.com/lucasurbanski/soma-do-bem-v2` — recebe dev + prod.
- **Repo antigo (referência):** `github.com/somadobem/somadobem` (frontend estático Vite/HTML).
- **Estratégia de branches:** `main` = **produção** · `develop` = **desenvolvimento**. Feature branches → PR para `develop`. Detalhe em `docs/12-environments.md`.
- **Supabase DEV:** projeto `gqzmwjhaygrmqypnwyzi` (ativo, migrations aplicadas, seed rodado).
- **Supabase PROD:** ⚠️ **a criar** (segundo projeto, separado). Ver `docs/12-environments.md`.
- **Deploy:** Vercel (dev = branch `develop` / preview; prod = `main`). A configurar.
- **Segredos:** só em `.env.local` (git-ignored). ⚠️ **service_role e senha do banco DEV foram compartilhados no chat → rotacionar antes de produção.**

## 5. Estado atual (o que existe e funciona)

### Banco (Supabase DEV) — migrations 0001–0007 aplicadas
- 28 tabelas, 27 com RLS. Ledger imutável + função `apply_donation_paid` + views públicas.
- Seed: bucket `campaign-media`, 3 usuários demo, 3 vaquinhas (2 ativas, 1 em análise).

### Núcleo financeiro (puro, testado — 35 testes verdes)
- `src/lib/money.ts`, `src/features/payments/fees.ts`, `src/features/ledger/*`, `src/features/campaigns/slug.ts`, `src/features/webhooks/processor.ts`.
- Provado no banco real via `scripts/smoke-e2e.mjs` (idempotência + RLS).

### Páginas implementadas
| Área | Rotas | Status |
|---|---|---|
| Público | `/`, `/causes`, `/causes/[slug]`, `/checkout`, `/checkout/[donationId]` | ✅ funcional |
| Institucional | `/como-funciona`, `/sobre`, `/taxas-e-prazos`, `/termos-de-uso`, `/politica-de-privacidade`, `/duvidas`, `/contato` | ✅ conteúdo real (revisar) |
| Auth | `/login`, `/register`, `/forgot-password` | ✅ funcional (cadastro dev usa admin.createUser) |
| Organizador | `/onboarding`, `/criar-vaquinha`, `/painel`, `/painel/vaquinhas`, `/painel/vaquinhas/[id]` | ✅ funcional |
| Denúncia | `/denunciar` | ✅ funcional |
| Admin | `/admin` + moderacao, vaquinhas, doacoes, ledger, webhooks, denuncias, usuarios, auditoria | ✅ funcional |
| API | `/api/webhooks/mock`, `/api/health`, `/api/ready` | ✅ funcional |

### Fluxo validado ponta a ponta
Cadastro → onboarding → criar vaquinha → enviar → **admin aprova** → pública → **contribuição mock** → simular confirmação (dev) → webhook idempotente → ledger → saldo/progresso. **Testado pelo Lucas: doação com confirmação dev funcionando.**

## 6. O que NÃO está pronto / pendências técnicas conhecidas

> Esta lista é a base da revisão página-por-página. Marcar `[x]` quando resolvido.

- [ ] Cadastro real com verificação por e-mail (hoje usa `admin.createUser` só para dev).
- [ ] Upload de imagem de capa no wizard de criação (campo/bucket prontos, UI não envia).
- [ ] Wizard de criação: hoje é um formulário em seções; avaliar wizard multi-etapas real com preview.
- [ ] Edição de vaquinha (rascunho) — só criação existe.
- [ ] Ações admin além de aprovar/rejeitar: pausar/suspender/encerrar na UI, workflow de denúncias.
- [ ] Google OAuth no login (visto no staging).
- [ ] Página "Sobre" com equipe real (fotos do repo antigo) — hoje é texto genérico.
- [ ] CSP com nonce (hoje usa `unsafe-inline/eval` por causa do Next dev).
- [ ] Playwright rodando (precisa `npx playwright install`).
- [ ] Estados vazios/erro revisados em todas as telas.
- [ ] Responsividade/mobile revisada tela a tela.
- [ ] Acessibilidade revisada (labels, foco, contraste) tela a tela.

## 7. Regras de negócio pendentes (Fase B)
Taxas, prazos, mínimos, reembolso, chargeback, KYC, split, responsável legal, promoções (corações/emojis/destaque/R$10). Fonte única: `docs/11-open-decisions.md`.

## 8. Gateway / financeiro (Fase C)
Woovi/OpenPix (conta a criar). Adapter pronto e **desativado**. Prontidão e endpoints: `docs/09-woovi-readiness.md`. Nada real será ligado sem aprovação.

## 9. Mapa de arquivos essenciais
- Migrations: `supabase/migrations/00NN_*.sql` (imutáveis após aplicadas; mudança = nova migration).
- Scripts: `scripts/db-migrate.mjs`, `scripts/seed.mjs`, `scripts/smoke-e2e.mjs`.
- Auth/sessão: `src/features/auth/session.ts`.
- Pagamentos: `src/features/payments/*` (+ `src/server/webhook-*`).
- Regras do agente/dev: `CLAUDE.md`. Índice de docs: `README.md`.

## 10. Como rodar
```bash
npm install
# .env.local a partir de .env.example
node --env-file=.env.local scripts/db-migrate.mjs
node --env-file=.env.local scripts/seed.mjs
npm run dev            # http://localhost:3000
# gates:
npm run lint && npm run typecheck && npm run test && npm run build
node --env-file=.env.local scripts/smoke-e2e.mjs
```
Usuários demo: `admin@apoieaqui.dev`/`Admin!2026dev`, `organizador@apoieaqui.dev`/`Org!2026dev`, `doador@apoieaqui.dev`/`Doa!2026dev`.

---

## 11. Histórico de movimentos (changelog)

> Formato: `AAAA-MM-DD` — o que foi feito. Entrada nova no topo.

### 2026-07-23 (b) — Contexto vivo + ambientes dev/prod no GitHub
- Criado `docs/CONTEXT.md` (este documento âncora, atualizado a cada movimento).
- Criado `docs/12-environments.md` (estratégia dev/prod: branches, Supabase, Vercel, migrations por ambiente).
- Criado `.github/workflows/ci.yml` (lint + typecheck + test + build em cada PR).
- Git: branch `master`→`main`; criado `develop`. Remote `origin` = `soma-do-bem-v2`.
- **Push feito:** `main` e `develop` no GitHub (repo antes vazio, agora populado). Trabalhando em `develop`.
- Pendente (você): criar projeto Supabase de **produção**; configurar env vars por ambiente na Vercel; proteger `main`.
- **Próximo:** iniciar revisão página por página (começando pela definição da ordem com o Lucas).

### 2026-07-23 (a) — Fundação + primeira entrega
- Auditoria do legado (mockups locais + staging via navegador + repos GitHub) → `docs/00`–`02`.
- 12 documentos de produto/arquitetura/segurança/pagamentos/roadmap/Woovi/deploy/decisões (`docs/00`–`11`).
- Migrations 0001–0007 (schema, financeiro, plataforma, RLS, config, views, `apply_donation_paid`) aplicadas no Supabase DEV.
- Núcleo financeiro puro + 35 testes Vitest (money, fees, ledger, slug, CPF, mock provider, webhook idempotência/concorrência).
- App Next.js completo (34 rotas): público, auth, onboarding, criar vaquinha, painel, admin (9 telas), checkout mock, webhook mock, health/ready.
- PaymentProvider (Mock ativo / Woovi desativado). Segurança: RLS negando por padrão, headers CSP/HSTS, rate limit, mascaramento CPF, logs redigidos.
- Gates verdes: build, lint, typecheck, 35 testes, smoke-e2e no banco real.
- Git inicializado, commit inicial `24a4fa0`.
- Lucas validou a doação com confirmação dev funcionando.
- **Próximo:** criar `docs/CONTEXT.md` (este), configurar ambientes dev/prod no GitHub, iniciar revisão página por página.
