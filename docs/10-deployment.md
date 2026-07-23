# 10 — Deployment e Operação

Documentação de **deployment** e **operação** da plataforma Soma do Bem — um
**monólito modular** em **Next.js (App Router)** com **Supabase** (PostgreSQL +
Auth + Storage). Cobre setup local, migrations, gates de qualidade, deploy na
**Vercel**, configuração de **Storage**, **webhooks**, health checks, go-live e
rollback.

Referências cruzadas:
- `docs/04-architecture.md` — arquitetura do monólito modular, módulos e fronteiras.
- `docs/06-security-and-privacy.md` — RLS, segredos, LGPD, superfícies de exposição.
- `docs/07-payment-architecture.md` — arquitetura de pagamentos (cobranças, reconciliação, split).
- `docs/09-woovi-readiness.md` — prontidão para ativação do gateway Woovi/OpenPix.

> **Fase atual:** MVP sem pagamento real. Todas as feature flags de pagamento,
> saque e KYC permanecem **desativadas** (`false`). Ver seção 11 (Limitações).

---

## 1. Pré-requisitos

| Item | Versão / Detalhe | Obrigatório |
|---|---|---|
| **Node.js** | **24 LTS** (usar `.nvmrc` / `engines` do `package.json`) | Sim |
| **npm** | Acompanha o Node 24 (gerenciador de pacotes oficial do projeto) | Sim |
| **Conta Supabase** | Projeto hospedado (Postgres + Auth + Storage) | Sim |
| **Conta Vercel** | Hospedagem do app Next.js | Sim (deploy) |
| **Git** | Acesso ao repositório | Sim |
| **Supabase CLI** | Para migrations/seed local | Opcional |
| **Docker** | Requerido **apenas** pelo `supabase start` (Supabase local) | Opcional |

> **Importante:** o ambiente de desenvolvimento atual **não** possui Docker. Por
> isso o Supabase local (`supabase start`) **não roda aqui**. As migrations são
> aplicadas em um **projeto Supabase remoto/hospedado** (ver seção 4). Quem
> tiver Docker pode opcionalmente usar o Supabase CLI local. Ver seção 11.

Confirme as versões antes de começar:

```bash
node --version   # deve reportar v24.x
npm --version
```

---

## 2. Variáveis de ambiente

Todos os valores reais ficam **fora do repositório**. O repo contém apenas um
`.env.example` com chaves e placeholders. Nunca commitar `.env.local`,
`.env.production` ou qualquer arquivo com segredos reais. Ver
`docs/06-security-and-privacy.md` para a política de segredos.

Convenção Next.js: variáveis com prefixo **`NEXT_PUBLIC_`** são embutidas no
bundle do browser (públicas). Todas as demais são **server-only** e nunca
chegam ao cliente.

### 2.1 Supabase / banco

| Variável | Escopo | Descrição |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Público | URL do projeto Supabase (ex.: `https://xxxx.supabase.co`). Usada pelo client no browser e no server. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Público | Chave `anon` (pública). Sujeita às políticas **RLS**; segura para o browser desde que RLS esteja correta. |
| `SUPABASE_SERVICE_ROLE_KEY` | **Server-only** | Chave `service_role`. **Ignora RLS** — acesso total ao banco. **NUNCA** expor ao browser, **NUNCA** prefixar com `NEXT_PUBLIC_`, **NUNCA** logar. Usar somente em código server-side (route handlers, server actions, jobs). Comprometê-la equivale a vazar o banco inteiro. |
| `DATABASE_URL` | **Server-only** | Connection string Postgres (`postgresql://...`). Usada por migrations/ferramentas de banco. Preferir o **pooler** (porta 6543) para runtime serverless e a conexão **direta** (porta 5432) para migrations. |
| `APP_BASE_URL` | **Server-only** | URL base pública da aplicação (ex.: `https://somadobem.com.br` ou a URL de preview). Usada para montar links absolutos, callbacks de auth e URLs de webhook. |

### 2.2 Feature flags (todas `false` nesta fase)

| Variável | Valor atual | Descrição |
|---|---|---|
| `PAYMENTS_ENABLED` | `false` | Liga/desliga o subsistema de pagamentos por completo. |
| `WOOVI_ENABLED` | `false` | Habilita a integração com o gateway Woovi/OpenPix. |
| `WOOVI_SPLIT_ENABLED` | `false` | Habilita split de pagamento (repartição entre destinatários). |
| `WOOVI_SUBACCOUNTS_ENABLED` | `false` | Habilita subcontas Woovi para organizadores. |
| `WITHDRAWALS_ENABLED` | `false` | Habilita fluxo de saque/repasse. |
| `KYC_ENABLED` | `false` | Habilita verificação de identidade (KYC). |

> Enquanto `PAYMENTS_ENABLED=false` e `WOOVI_ENABLED=false`, o checkout opera em
> **modo mock**. Ver `docs/07-payment-architecture.md` e `docs/09-woovi-readiness.md`.

### 2.3 Woovi / OpenPix (desativado nesta fase)

| Variável | Escopo | Descrição |
|---|---|---|
| `WOOVI_APP_ID` | **Server-only** | AppID da conta Woovi. **Vazio** nesta fase (integração desativada). |
| `WOOVI_API_BASE_URL` | **Server-only** | Base da API. Sandbox: `https://api.woovi-sandbox.com` — Produção: `https://api.openpix.com.br`. |
| `WOOVI_WEBHOOK_HMAC_SECRET` | **Server-only** | Segredo HMAC para validar a assinatura dos webhooks Woovi. Vazio até ativação. |
| `WOOVI_WEBHOOK_PUBLIC_KEY` | **Server-only** | Chave pública para verificar webhooks assinados pela Woovi. Vazio até ativação. |
| `MOCK_WEBHOOK_SECRET` | **Server-only** | Segredo do webhook **mock** (`/api/webhooks/mock`), usado para simular confirmações de pagamento em dev/staging sem gateway real. |

### 2.4 Observabilidade (opcionais)

| Variável | Escopo | Descrição |
|---|---|---|
| `SENTRY_DSN` | Server-only | DSN do Sentry para captura de erros. Opcional; se ausente, telemetria de erro fica desligada. |
| `NEXT_PUBLIC_POSTHOG_KEY` | Público | Chave de projeto do PostHog (analytics de produto). Opcional. |

> Segredos com escopo **server-only** devem ser configurados na Vercel como
> variáveis **não** prefixadas com `NEXT_PUBLIC_` e marcadas como sensíveis.
> Ver seção 6.3.

---

## 3. Setup local (passo a passo)

```bash
# 1. Instalar dependências
npm install

# 2. Criar o arquivo de ambiente local a partir do template
cp .env.example .env.local        # PowerShell: Copy-Item .env.example .env.local

# 3. Preencher .env.local com os valores do projeto Supabase hospedado
#    (URL, anon key, service_role key, DATABASE_URL, APP_BASE_URL=http://localhost:3000)
#    Manter todas as feature flags de pagamento/KYC/saque como false.

# 4. Aplicar as migrations no projeto Supabase remoto (ver seção 4)

# 5. Rodar os seeds (ver seção 4.3)

# 6. Subir o servidor de desenvolvimento
npm run dev
```

App disponível em `http://localhost:3000`.

> Sem Docker no ambiente atual, o passo 4 aponta para um **projeto Supabase
> hospedado** (dev/staging), não para um Postgres local.

---

## 4. Migrations, RLS e seeds

As migrations vivem em **`supabase/migrations/`** com **prefixo numérico
sequencial** (ex.: `0001_init.sql`, `0002_campaigns.sql`, ...). A ordem de
aplicação é **estritamente a ordem numérica** dos arquivos. As **RLS policies**
fazem parte das migrations (não são aplicadas à parte) — cada tabela sensível
deve ter `ENABLE ROW LEVEL SECURITY` e suas policies no mesmo conjunto
versionado. Ver `docs/06-security-and-privacy.md` para o desenho de RLS.

### 4.1 Aplicar migrations sem Docker (caminho padrão desta fase)

Como o Supabase local exige Docker, use um dos caminhos abaixo contra o
**projeto hospedado**:

**Opção A — Supabase CLI com `db push` (link ao projeto remoto):**

```bash
npx supabase login
npx supabase link --project-ref <project-ref>
npx supabase db push        # aplica as migrations pendentes no banco remoto
```

**Opção B — SQL Editor do Supabase (sem CLI):**

1. Acesse o projeto no dashboard do Supabase → **SQL Editor**.
2. Abra cada arquivo de `supabase/migrations/` **na ordem numérica**.
3. Cole e execute um a um, do menor número para o maior.
4. Não pule arquivos e não altere a ordem — migrations são cumulativas.

> As policies de RLS estão embutidas nesses arquivos; ao rodar as migrations em
> ordem, elas são criadas junto com as tabelas.

### 4.2 Aplicar migrations com Docker (opcional, quem tiver)

```bash
npx supabase start          # sobe o stack local (REQUER Docker)
npx supabase db reset       # recria o banco local e aplica todas as migrations + seed
```

### 4.3 Seeds

Os dados de seed ficam em **`supabase/seed.sql`** (e/ou scripts em
`supabase/seeds/`). Aplicar **depois** das migrations:

- **Via CLI + Docker:** `supabase db reset` já roda o `seed.sql` ao final.
- **Via remoto:** rodar `supabase db push` e depois executar o `seed.sql` pelo
  **SQL Editor**, ou `psql "$DATABASE_URL" -f supabase/seed.sql`.

> Seeds são para dados de exemplo/dev (categorias, vaquinhas demo). **Nunca**
> rodar seeds de desenvolvimento em produção.

---

## 5. Gates de qualidade

Todos devem passar antes de merge e antes de deploy de produção. São os mesmos
comandos que o CI executa.

| Comando | O que faz |
|---|---|
| `npm run lint` | ESLint (+ regras Prettier). Falha em qualquer warning tratado como erro. |
| `npm run typecheck` | `tsc --noEmit` em modo **strict**. Zero erros de tipo. |
| `npm run test` | Testes unitários/integração com **Vitest**. |
| `npm run test:e2e` | Testes end-to-end com **Playwright**. |
| `npm run build` | Build de produção do Next.js. Deve compilar sem erros. |

Sequência recomendada local antes de abrir PR:

```bash
npm run lint && npm run typecheck && npm run test && npm run build
```

Rode `npm run test:e2e` quando houver mudança de fluxo de UI/navegação
(o Playwright pode exigir `npx playwright install` na primeira execução).

---

## 6. Deploy na Vercel

### 6.1 Conectar o repositório

1. Na Vercel, **New Project** → importe o repositório Git.
2. Framework preset: **Next.js** (detectado automaticamente).
3. Build command: `npm run build` (padrão). Install: `npm install`.
4. Node.js version: **24** (Project Settings → General).

### 6.2 Região

Configure a região da Vercel (Functions/Edge) próxima do banco Supabase — por
padrão **`gru1` (São Paulo)**, para minimizar latência ao Postgres brasileiro.
A região do projeto Supabase também deve ser Brasil/South America.

### 6.3 Variáveis de ambiente (separação pública vs server-only)

Em **Project Settings → Environment Variables**, cadastre todas as variáveis da
seção 2, respeitando o escopo:

- **Públicas (`NEXT_PUBLIC_*`)** — embutidas no bundle do browser:
  `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
  `NEXT_PUBLIC_POSTHOG_KEY`.
- **Server-only** — nunca expor ao cliente, marcar como **sensível**:
  `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`, `APP_BASE_URL`, todas as flags
  (`PAYMENTS_ENABLED`, ...), `WOOVI_*`, `MOCK_WEBHOOK_SECRET`, `SENTRY_DSN`.

> **Regra crítica:** `SUPABASE_SERVICE_ROLE_KEY` **jamais** recebe prefixo
> `NEXT_PUBLIC_`. Um prefixo errado vaza a chave de acesso total no bundle
> público. Revise a lista antes de cada deploy.

### 6.4 Preview vs Production

- Defina o escopo de cada variável por ambiente: **Production**, **Preview** e
  **Development**.
- Use um **projeto Supabase separado** (ou ao menos schema/credenciais
  distintas) para Preview/Staging e para Production — nunca compartilhe a
  service role de produção com previews.
- `APP_BASE_URL` deve refletir a URL de cada ambiente (produção vs URL de
  preview gerada pela Vercel).
- Cada push em branch gera um **Preview Deployment**; merge na branch de
  produção dispara o **Production Deployment**.

---

## 7. Configuração de Storage (imagens de capa)

O Supabase Storage guarda as **imagens de capa** das vaquinhas.

1. **Bucket:** criar `campaign-covers` (ou o nome definido no código). Manter
   **privado** e servir via URL assinada, ou público-somente-leitura conforme
   `docs/06-security-and-privacy.md`.
2. **Upload validado (server-side):**
   - Validar **MIME type** (apenas `image/jpeg`, `image/png`, `image/webp`).
   - Validar **tamanho máximo** (limite definido em código/policy).
   - Gerar **nome aleatório** (ex.: UUID) — **nunca** confiar no filename do
     usuário, evitando colisões e path traversal.
3. **Políticas de acesso (RLS de Storage):**
   - Leitura pública apenas do bucket de capas (se público).
   - Escrita/atualização/remoção restrita ao **organizador dono** da vaquinha,
     validada por policy (não confiar no cliente).
   - Uploads server-side usam a service role; uploads diretos do cliente, se
     existirem, passam por RLS de Storage.

---

## 8. Webhooks

As rotas de webhook já existem no código, porém **desativadas por flag** nesta
fase. Ver `docs/07-payment-architecture.md` e `docs/09-woovi-readiness.md`.

| Rota | Uso | Segredo de validação |
|---|---|---|
| `POST /api/webhooks/woovi` | Confirmações reais do gateway Woovi/OpenPix (quando ativado) | `WOOVI_WEBHOOK_HMAC_SECRET` / `WOOVI_WEBHOOK_PUBLIC_KEY` |
| `POST /api/webhooks/mock` | Simulação de confirmação de pagamento em dev/staging | `MOCK_WEBHOOK_SECRET` |

- **URL a configurar no gateway (na ativação):**
  `https://<APP_BASE_URL>/api/webhooks/woovi`.
- **URL do mock:** `https://<APP_BASE_URL>/api/webhooks/mock`.
- Toda confirmação de pagamento é **server-side e idempotente**, validada por
  assinatura — nunca confiar em callback de cliente.

> **Nesta fase, `PAYMENTS_ENABLED` e `WOOVI_ENABLED` permanecem `false`.** Não
> configure o webhook da Woovi no painel do gateway ainda; use apenas o mock em
> ambientes não-produtivos. A ativação segue o checklist de
> `docs/09-woovi-readiness.md`.

---

## 9. Health check e readiness

| Endpoint | Propósito | Resposta esperada |
|---|---|---|
| `GET /api/health` | **Liveness** — o processo está no ar. Não toca dependências externas. | `200` com `{ "status": "ok" }`. |
| `GET /api/ready` | **Readiness** — dependências críticas OK (conexão com o banco Supabase, e config essencial presente). | `200` se pronto; `503` se alguma dependência falhar. |

- Use `/api/health` para uptime checks simples.
- Use `/api/ready` como gate pós-deploy (smoke test) antes de promover tráfego.
- Os endpoints **não** devem expor segredos nem detalhes internos sensíveis.

---

## 10. Checklist de go-live e rollback

### 10.1 Go-live

- [ ] `npm run lint`, `npm run typecheck`, `npm run test`, `npm run test:e2e` e
      `npm run build` verdes.
- [ ] Migrations aplicadas no banco de produção (ordem numérica) — seção 4.
- [ ] **RLS habilitada** em todas as tabelas sensíveis e policies validadas
      (`docs/06-security-and-privacy.md`).
- [ ] Variáveis de ambiente de produção conferidas na Vercel; escopo público vs
      server-only correto.
- [ ] `SUPABASE_SERVICE_ROLE_KEY` **não** exposta (sem prefixo `NEXT_PUBLIC_`,
      ausente do bundle do browser).
- [ ] Feature flags de pagamento/saque/KYC em `false` (fase MVP).
- [ ] Bucket de Storage criado com validação de upload e policies de acesso.
- [ ] `APP_BASE_URL` de produção correta; links absolutos e auth callbacks OK.
- [ ] Região da Vercel e do Supabase alinhadas (Brasil).
- [ ] `GET /api/health` → 200 e `GET /api/ready` → 200 em produção.
- [ ] Sentry/PostHog configurados (se em uso).
- [ ] Seeds de desenvolvimento **não** aplicados em produção.

### 10.2 Rollback

- **App (Vercel):** promover o **Deployment anterior** (Instant Rollback) na
  aba Deployments — reversão imediata sem rebuild.
- **Feature flags:** desligar a flag problemática (ex.: retornar
  `PAYMENTS_ENABLED=false`) e redeploy — reverte comportamento sem tocar código.
- **Banco de dados:** migrations são **forward-only**. Reverter exige uma
  **nova migration compensatória** (nunca editar migration já aplicada).
  Restaurar via **backup/PITR** do Supabase apenas em incidente grave, com
  janela de manutenção. **Sempre** ter backup válido antes de migrations
  destrutivas.
- Registrar causa e ações no pós-incidente.

---

## 11. Limitações do ambiente atual

- **Sem Docker → sem Supabase local.** O comando `supabase start` (que exige
  Docker) **não roda** neste ambiente de desenvolvimento. Migrations e seeds são
  aplicados em um **projeto Supabase hospedado** via `supabase db push` ou pelo
  **SQL Editor** do dashboard (seção 4). Ambientes com Docker podem usar o
  Supabase local opcionalmente.
- **Pagamentos desativados.** `PAYMENTS_ENABLED`, `WOOVI_ENABLED`,
  `WOOVI_SPLIT_ENABLED`, `WOOVI_SUBACCOUNTS_ENABLED`, `WITHDRAWALS_ENABLED` e
  `KYC_ENABLED` permanecem `false`. O checkout roda em **modo mock**; nenhuma
  cobrança real é criada e o webhook da Woovi **não** deve ser configurado no
  gateway ainda. Credenciais Woovi (`WOOVI_APP_ID`, segredos de webhook) ficam
  vazias. A ativação segue `docs/09-woovi-readiness.md`.
- **Segredos fora do repo.** Nenhum valor real de variável de ambiente é
  versionado; apenas `.env.example` com placeholders.
