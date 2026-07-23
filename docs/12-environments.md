# 12 — Ambientes (dev / produção) e fluxo de desenvolvimento

Objetivo: fazer tudo "da forma correta" — **dois ambientes isolados** (desenvolvimento e produção),
com branches, banco e deploy separados, e segredos nunca versionados.

## 1. Visão geral

| Recurso | Desenvolvimento (dev) | Produção (prod) |
|---|---|---|
| Branch Git | `develop` | `main` |
| Supabase | projeto `gqzmwjhaygrmqypnwyzi` (existente) | **novo projeto a criar** |
| Deploy Vercel | Preview / Environment "Development" (branch `develop`) | Production (branch `main`) |
| Feature flags | podem ser ligadas para testar (sandbox Woovi) | tudo real só quando aprovado |
| Dados | seed de demonstração | dados reais, **sem seed demo** |

Regra de ouro: **dev e prod não compartilham banco nem segredos.** Nunca aponte o app de produção
para o Supabase de dev (nem o contrário).

## 2. Estratégia de branches (Git)

```
main      ──●────────────●───────  (produção; só via PR revisado)
             \          /
develop   ────●──●──●──●──────────  (integração/dev; deploy de preview)
                \  /
feature/*  ──────●   (branches curtas → PR para develop)
```

- `feature/<nome>` → PR para **`develop`** (roda CI: lint + typecheck + test + build).
- `develop` → acumula o que está pronto; deploy automático no ambiente de dev.
- `develop` → PR para **`main`** quando for promover para produção.
- **Nunca** commitar direto em `main`. Proteções recomendadas no GitHub (ver §6).

## 3. Segredos por ambiente

Cada ambiente tem seu conjunto de variáveis (ver `.env.example`). **Nada disso vai para o Git.**

- **Local (dev):** `.env.local` apontando para o Supabase de dev.
- **Vercel — Development/Preview:** variáveis do Supabase de **dev**.
- **Vercel — Production:** variáveis do Supabase de **prod** (projeto novo).

Variáveis que mudam por ambiente: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
`SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`, `APP_BASE_URL`, e mais tarde as `WOOVI_*`.

⚠️ **Rotacionar** os segredos do Supabase de dev que foram compartilhados no chat, e gerar segredos
**novos e distintos** para produção.

## 4. Migrations por ambiente

As mesmas migrations rodam nos dois bancos, na ordem. Fluxo:

```bash
# DEV (já feito)
node --env-file=.env.local scripts/db-migrate.mjs

# PROD (quando o projeto existir): usar um .env.production.local (git-ignored)
node --env-file=.env.production.local scripts/db-migrate.mjs
```

- Migrations são **imutáveis após aplicadas** (registro em `schema_migrations`). Mudança = nova migration.
- **Seed demo (`scripts/seed.mjs`) só em dev.** Produção não recebe usuários/vaquinhas fictícios.

## 5. Passo a passo para configurar (o que precisa de você)

### 5.1 GitHub (repo soma-do-bem-v2)
1. Adicionar o remote e enviar as branches (ver §7 — comandos prontos).
2. Em Settings → Branches: proteger `main` (exigir PR + CI verde).

### 5.2 Supabase de produção
1. Criar um **novo projeto** Supabase (nome ex.: `apoie-aqui-prod`).
2. Copiar URL, anon key, service role e connection string para as env vars de produção (Vercel).
3. Rodar as migrations nesse banco (`scripts/db-migrate.mjs` com o `.env` de prod).
4. **Não** rodar o seed demo.

### 5.3 Vercel
1. Importar o repo `soma-do-bem-v2`.
2. Configurar env vars separadas para **Production** (Supabase prod) e **Preview/Development** (Supabase dev).
3. Production Branch = `main`. Preview = `develop` e PRs.
4. Deploy.

## 6. Proteções recomendadas (GitHub)
- Branch protection em `main`: exigir PR, exigir status do CI, proibir push direto.
- Secrets do CI (se rodar testes que tocam banco) em GitHub Actions → Settings → Secrets.
- Nunca colar segredos em issues/PRs.

## 7. Comandos para publicar (rodar você mesmo, com sua autenticação)

No terminal do Claude Code, use o prefixo `!` para executar com sua sessão:

```bash
# na pasta do projeto
git remote add origin https://github.com/lucasurbanski/soma-do-bem-v2.git
git branch -M main
git push -u origin main
git checkout -b develop
git push -u origin develop
```

Se pedir autenticação, use um Personal Access Token do GitHub (Settings → Developer settings →
Tokens) como senha, ou o GitHub CLI/credential manager.

## 8. CI (GitHub Actions)
O workflow `.github/workflows/ci.yml` roda em cada PR/branch: `npm ci`, lint, typecheck, testes e build.
Não toca no banco nem usa segredos reais (usa valores dummy só para o build compilar).
