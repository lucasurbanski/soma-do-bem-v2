# 04 — Arquitetura

## Visão geral

Apoie Aqui é um **monólito modular** em **Next.js (App Router)** + **Supabase** (PostgreSQL, Auth, Storage). Uma única aplicação, sem microsserviços e sem filas externas nesta fase. A separação é feita por **camadas** e por **módulos de feature**, não por serviços.

Princípios:
- **Tudo que é sensível roda no servidor** (Server Components, Server Actions, Route Handlers).
- **RLS no banco** como segunda barreira de autorização.
- **Regras financeiras 100% server-side**, idempotentes, auditáveis; ledger imutável como fonte oficial.
- **Dinheiro em centavos** (inteiros) de ponta a ponta.
- **Segredos só no servidor**; a service role nunca chega ao browser.

```mermaid
flowchart TB
  subgraph Browser
    UI[React Client Components<br/>formulários, menus]
  end
  subgraph Next["Next.js (App Router) — servidor"]
    RSC[Server Components<br/>páginas]
    SA[Server Actions<br/>mutations validadas com Zod]
    RH[Route Handlers<br/>/api/webhooks/mock, /api/health, /api/ready]
    MW[Middleware<br/>refresh de sessão + proteção de rotas]
  end
  subgraph Domain["Domínio (src/features, src/lib)"]
    PAY[payments: PaymentProvider<br/>Mock / Woovi]
    LED[ledger: postings + balance]
    FEE[fees: cálculo versionado]
    WH[webhooks: processor idempotente]
  end
  subgraph Supabase
    DB[(PostgreSQL<br/>RLS + ledger + functions)]
    AUTH[Supabase Auth]
    ST[Supabase Storage<br/>campaign-media]
  end
  GW[[Gateway Pix<br/>Mock agora / Woovi futuro]]

  UI -->|form action| SA
  UI --> RSC
  RSC -->|anon key + sessão, RLS| DB
  SA -->|service role, privilegiado| DB
  SA --> PAY
  PAY --> GW
  GW -->|webhook| RH
  RH --> WH --> LED --> DB
  SA --> FEE
  MW --> AUTH
  RSC --> AUTH
  RH -->|service role| DB
```

## Camadas (separação obrigatória)

O escopo exige separar interface, validação, caso de uso, acesso a dados e integração externa. Mapeamento no código:

| Camada | Onde | Exemplo |
|---|---|---|
| **Interface** | `src/app/**` (páginas), `src/components/**`, `*Form.tsx` client | `CampaignCard`, `DonationForm` |
| **Validação** | Zod nos Server Actions/Route Handlers | `schema.safeParse` em `donations/actions.ts` |
| **Caso de uso** | `src/features/*/actions.ts` e `src/features/*/*.ts` (lógica pura) | `createMockDonation`, `processWebhook` |
| **Acesso a dados** | `src/features/*/queries.ts`, `src/server/*`, clientes Supabase | `SupabaseWebhookRepository`, `queries.ts` |
| **Integração externa** | `src/features/payments/*` (PaymentProvider) | `MockPaymentProvider`, `WooviPaymentProvider` |

**Regra:** nenhuma regra de negócio dentro de componentes React. Componentes só renderizam e disparam actions.

## Estrutura de pastas (real)

```
src/
  app/
    (site)/            # área pública + auth + painel (Header/Footer)
      page.tsx         # home
      causes/          # listagem + [slug]
      checkout/        # form + [donationId] status
      login/ register/ forgot-password/
      criar-vaquinha/ onboarding/ painel/ denunciar/
      como-funciona/ sobre/ taxas-e-prazos/ termos-de-uso/ ...
    admin/             # painel administrativo (layout próprio, requireStaff)
    api/               # webhooks/mock, health, ready
    layout.tsx globals.css error.tsx not-found.tsx
  components/          # UI reutilizável (Header, Footer, CampaignCard, ...)
  features/
    auth/ profiles/ onboarding/ campaigns/ donations/
    payments/ ledger/ webhooks/ moderation/ reports/
  lib/                # money, br, logger, rate-limit, feature-flags, supabase/*
  server/             # implementações server-only (webhook repo/handler)
  types/              # tipos gerados/compartilhados
  middleware.ts
supabase/migrations/  # schema + RLS + functions + seed de config
scripts/              # db-migrate, seed, smoke-e2e
docs/
```

## Fluxos principais (Mermaid)

### Criação da vaquinha
```mermaid
sequenceDiagram
  actor Org as Organizador
  participant UI as CreateCampaignForm
  participant SA as createCampaignDraft (Server Action)
  participant DB as Supabase (service role)
  Org->>UI: preenche etapas
  UI->>SA: form action (FormData)
  SA->>SA: Zod valida + reaisToCents
  SA->>DB: gera slug único, insere campaign (draft)
  SA->>DB: beneficiário + status_history + role organizer + audit_log
  SA-->>Org: redirect /painel/vaquinhas/[id]
  Org->>SA: submitForReview (draft -> pending_review)
  SA->>DB: update status + status_history + audit
```

### Contribuição (mock)
```mermaid
sequenceDiagram
  actor Doador
  participant UI as DonationForm
  participant SA as createMockDonation
  participant PV as MockPaymentProvider
  participant DB as Supabase
  Doador->>UI: valor, nome, e-mail, consentimento
  UI->>SA: form action
  SA->>SA: Zod + valida mínimo (server-side)
  SA->>DB: insere donation (created)
  SA->>PV: createCharge(correlationId=donationId)
  PV-->>SA: brCode (mock), status pending
  SA->>DB: insere payment_charge + donation=pending + audit
  SA-->>Doador: redirect /checkout/[donationId] (aguardando)
```

### Processamento do webhook
```mermaid
sequenceDiagram
  participant GW as Gateway (mock/woovi)
  participant RH as /api/webhooks/mock
  participant H as handleWebhook
  participant P as processWebhook
  participant DB as Supabase
  GW->>RH: POST corpo bruto + assinatura
  RH->>H: rawBody, headers
  H->>H: verifyWebhook (HMAC) + parseWebhook
  H->>P: parsed + signatureValid + releaseImmediately
  P->>DB: recordWebhookEvent (unique provider,event_id)
  alt já processado
    P-->>RH: duplicate (2xx)
  else novo
    P->>DB: getCharge + fee ativa
    P->>P: computeDonationSplit
    P->>DB: apply_donation_paid (transação: 4 lançamentos + status + cache)
    P-->>RH: processed (2xx rápido)
  end
```

### Cálculo de saldo
```mermaid
flowchart LR
  L[(ledger_entries<br/>imutável)] -->|campaign_ledger_balance| B{Saldo}
  B --> R[raised_gross]
  B --> P[pending]
  B --> A[available]
  B --> W[withdrawn]
  A -.->|my_campaign_balance RPC<br/>SECURITY DEFINER| ORG[Organizador vê o seu]
  L -.->|cache| C[campaigns.raised_amount_cents<br/>NÃO é fonte oficial]
```

### Solicitação de saque (preparado, desativado)
```mermaid
sequenceDiagram
  actor Org
  participant UI as Painel
  Note over UI: WITHDRAWALS_ENABLED=false
  UI-->>Org: área de saque desabilitada + explicação
  Note over Org,UI: Quando habilitado: withdrawal_requests -> revisão -> payout via provider
```

## Decisões arquiteturais (ADR resumido)

- **Monólito modular (não microsserviços):** simplicidade operacional, menor superfície de ataque, transações locais. Escopo exige.
- **Supabase:** Postgres gerenciado + Auth + Storage + RLS num só lugar → segurança concentrada e menos código de infra.
- **Server Actions para mutations:** proteção CSRF nativa do Next, validação server-side, nada de valores confiados ao cliente.
- **Service role só no servidor** para escritas privilegiadas (webhook, moderação, doações), com RLS protegendo o acesso via anon.
- **Ledger imutável + idempotência** por índice único, não por lock aplicacional → correto sob concorrência.
- **PaymentProvider como porta/adaptador:** troca de gateway (Asaas→Woovi) sem tocar no domínio; Mock permite testar tudo sem dinheiro real.

Ver também: `docs/05-domain-model.md`, `docs/06-security-and-privacy.md`, `docs/07-payment-architecture.md`.
