# 08 - Implementation Roadmap

Roadmap de implementação da plataforma de vaquinhas (Soma do Bem). Stack: Next.js (App Router) + TypeScript `strict` + Supabase (Postgres, Auth, RLS, Storage) + Tailwind CSS + Zod + Vitest + Playwright. Arquitetura de monólito modular conforme [docs/04-architecture.md](./04-architecture.md).

Este documento descreve a sequência de fases até produção completa e detalha a **Fase 1 (MVP mock)**, que é o escopo desta execução.

## Referências cruzadas

- [docs/04-architecture.md](./04-architecture.md) — camadas, módulos, fronteiras, convenções de código.
- [docs/05-domain-model.md](./05-domain-model.md) — entidades, agregados, invariantes, estados.
- [docs/07-payment-architecture.md](./07-payment-architecture.md) — `PaymentProvider`, webhook pipeline, ledger, idempotência.
- [docs/09-woovi-readiness.md](./09-woovi-readiness.md) — preparação para integração Woovi (sandbox, split, subcontas).
- [docs/11-open-decisions.md](./11-open-decisions.md) — decisões em aberto e trade-offs pendentes.

## Feature flags (fonte da verdade)

Todas as flags abaixo iniciam em `false` nesta entrega. A camada de pagamentos e o domínio devem ler exclusivamente estas flags — nenhum caminho de código pode assumir pagamento real habilitado.

| Flag | Default | Efeito quando `true` |
| --- | --- | --- |
| `PAYMENTS_ENABLED` | `false` | Habilita processamento de pagamento real (desabilitado: usa `MockPaymentProvider`). |
| `WOOVI_ENABLED` | `false` | Ativa `WooviPaymentProvider` (sandbox/produção). |
| `WOOVI_SPLIT_ENABLED` | `false` | Habilita split de valores entre plataforma e organizador. |
| `WOOVI_SUBACCOUNTS_ENABLED` | `false` | Habilita subcontas por organizador. |
| `WITHDRAWALS_ENABLED` | `false` | Libera solicitação e processamento de saques. |
| `KYC_ENABLED` | `false` | Exige e processa verificação KYC do beneficiário/organizador. |

Regra: uma flag `true` só é permitida quando suas dependências estão prontas (ex.: `WOOVI_SPLIT_ENABLED` exige `WOOVI_ENABLED`).

---

## 1. Visão de fases

### Fase 0 — Fundação

- **Objetivo:** repositório, toolchain e contratos de arquitetura prontos para desenvolvimento paralelo e seguro.
- **Entregáveis:** monorepo/monólito inicial Next.js + TS strict; ESLint/Prettier; Vitest + Playwright configurados; CI (lint, typecheck, test); estrutura de módulos de domínio conforme docs/04; convenção de feature flags; template de variáveis de ambiente (`.env.example`) sem segredos; Supabase local (CLI) e projeto sandbox.
- **Critérios de saída:** `pnpm lint`, `pnpm typecheck` e `pnpm test` passam em CI; build de produção compila; feature flags lidas de config tipada; nenhuma chave real versionada.
- **Feature flags:** todas definidas e `false`.

### Fase 1 — MVP mock (ESTA ENTREGA)

- **Objetivo:** plataforma funcional ponta a ponta sem dinheiro real — cadastro, onboarding de organizador, criação de vaquinha em etapas, moderação/aprovação, publicação, contribuição mock, webhook mock idempotente, ledger e saldo.
- **Entregáveis:** ver Seção 2 (blocos de trabalho).
- **Critérios de saída:** todos os critérios de aceite da Seção 4 satisfeitos; suíte de testes verde; RLS aplicada e testada; `PAYMENTS_ENABLED=false` em todo o fluxo.
- **Feature flags:** todas `false`. `MockPaymentProvider` é o provedor ativo.

### Fase 2 — Woovi sandbox

- **Objetivo:** integrar cobrança Pix real em ambiente sandbox, mantendo o mesmo contrato `PaymentProvider`.
- **Entregáveis:** `WooviPaymentProvider` implementado (criação de cobrança, consulta, cancelamento); verificação de assinatura de webhook Woovi; mapeamento de eventos Woovi para o pipeline existente; testes de contrato contra sandbox; runbook de rotação de chaves.
- **Critérios de saída:** contribuição real em sandbox gera lançamento correto no ledger via webhook assinado; idempotência mantida; troca Mock↔Woovi por flag sem alterar domínio.
- **Feature flags:** `PAYMENTS_ENABLED=true` e `WOOVI_ENABLED=true` apenas em ambiente sandbox; demais `false`.

### Fase 3 — Split, subcontas, KYC e saques

- **Objetivo:** repasse real de valores ao organizador com conformidade.
- **Entregáveis:** split de cobrança; provisionamento de subcontas por organizador; fluxo e verificação KYC; solicitação, aprovação e execução de saque; reconciliação de saldo disponível vs. pendente.
- **Critérios de saída:** ciclo completo contribuição → split → subconta → saque reconciliado em sandbox; KYC bloqueia saque de beneficiário não verificado; auditoria completa de cada movimentação.
- **Feature flags:** `WOOVI_SPLIT_ENABLED`, `WOOVI_SUBACCOUNTS_ENABLED`, `KYC_ENABLED`, `WITHDRAWALS_ENABLED` ativadas gradualmente.

### Fase 4 — Monetização (corações/emojis/destaque)

- **Objetivo:** produtos pagos de engajamento — corações, emojis e destaque de vaquinha.
- **Entregáveis:** catálogo de itens pagos; compra via mesmo pipeline de pagamento; contabilização separada no ledger; regras de exibição de destaque; antifraude básico.
- **Critérios de saída:** compra de item pago reflete no perfil/vaquinha; receita da plataforma segregada no ledger; nada quebra com pagamentos desabilitados.
- **Feature flags:** depende de `PAYMENTS_ENABLED`; itens ficam ocultos quando pagamentos desabilitados.

### Fase 5 — Hardening, observabilidade e escala

- **Objetivo:** prontidão para produção sob carga.
- **Entregáveis:** métricas, tracing e alertas; rate limiting; dead-letter para webhooks; backups e disaster recovery; testes de carga; revisão de segurança e LGPD; documentação operacional.
- **Critérios de saída:** SLOs definidos e monitorados; runbooks de incidente; testes de carga dentro do alvo; auditoria de segurança sem itens críticos abertos.
- **Feature flags:** todas conforme ambiente; foco em governança de ativação.

---

## 2. Detalhamento da Fase 1 (MVP mock)

Blocos de trabalho com dependências explícitas. `→` indica pré-requisito.

### B0 — Setup do projeto
Next.js App Router, TS strict, Tailwind, Zod, Vitest, Playwright, ESLint/Prettier, config tipada de feature flags, `.env.example`, layout de módulos de domínio (docs/04). **Dep:** nenhuma.

### B1 — Schema + migrations + RLS + seeds
Modelagem conforme docs/05: `users`/`profiles`, `organizers`, `campaigns` (vaquinhas), `campaign_drafts`/estados do wizard, `beneficiaries`, `moderation_reviews`, `contributions`, `payment_intents`, `webhook_events`, `ledger_entries`, `balances`. Migrations versionadas; políticas RLS por papel (visitante, usuário, organizador, admin); seeds de categorias, admin e dados de demonstração. **Dep:** B0.

### B2 — Auth + aceite de termos
Supabase Auth (e-mail/senha e/ou magic link); criação de `profile` no primeiro login; registro de aceite de termos (versão + timestamp) exigido antes de ações sensíveis; guarda de sessão em Server Components e Route Handlers. **Dep:** B1.

### B3 — Onboarding do organizador
Formulário de dados do organizador; transição de usuário comum para papel organizador; validação Zod; persistência com RLS; estado de onboarding incompleto vs. completo. **Dep:** B2.

### B4 — Wizard de criação (10 etapas)
Fluxo em etapas com rascunho persistido e retomável: (1) básico, (2) categoria, (3) localização, (4) meta, (5) título, (6) história, (7) capa (upload para Supabase Storage), (8) beneficiário, (9) preview, (10) envio. Cada etapa com schema Zod próprio; validação incremental; envio muda estado para `pending_review`. **Dep:** B3.

### B5 — Moderação / admin
Área restrita a admin (RLS + guarda de rota); fila de vaquinhas `pending_review`; ações aprovar/rejeitar com motivo; registro em `moderation_reviews`; aprovação muda estado para `published`. **Dep:** B4.

### B6 — Página pública + listagem + busca
Página pública da vaquinha (história, meta, progresso, capa, beneficiário); listagem paginada de vaquinhas publicadas; busca por título/categoria/localização; apenas estado `published` é visível a visitantes. **Dep:** B5.

### B7 — Fluxo de contribuição mock
Formulário de contribuição (valor, contribuinte anônimo ou autenticado); criação de `contribution` + `payment_intent` via camada de pagamentos; página de "aguardando confirmação"; nenhum dado financeiro real. **Dep:** B6, B8.

### B8 — Camada de pagamentos
Interface `PaymentProvider` (docs/07); `MockPaymentProvider` (cria intent, simula confirmação e dispara webhook mock); `WooviPaymentProvider` presente porém **desativado** por flag; seleção de provedor por feature flags. **Dep:** B1.

### B9 — Webhook pipeline idempotente
Route Handler de webhook; validação de payload; deduplicação por chave de idempotência em `webhook_events` (evento duplicado é reconhecido e ignorado); confirmação de `payment_intent`; disparo da criação de lançamentos no ledger dentro de transação. **Dep:** B8.

### B10 — Ledger + cálculo de saldo
`ledger_entries` append-only (débito/crédito, origem, referência); criação atômica na confirmação; cálculo de saldo pendente vs. disponível derivado do ledger (docs/05, docs/07); saque **não disponível** (flag `WITHDRAWALS_ENABLED=false`). **Dep:** B9.

### B11 — Dashboard do organizador
Visão do organizador com suas vaquinhas, progresso, saldo pendente e disponível, lista de contribuições; botão/seção de saque presente porém **desabilitado** com aviso. **Dep:** B10.

### B12 — Observabilidade básica
Logging estruturado (request id, actor, evento); trilha de auditoria para ações sensíveis (aprovação, mudança de estado, criação de lançamento); tratamento e página de erro padronizados; health check. **Dep:** B0 (transversal).

### B13 — Testes
Unitários (Vitest) para regras de domínio, schemas Zod, idempotência e cálculo de saldo; integração para webhook e ledger; E2E (Playwright) do fluxo crítico (cadastro → onboarding → criação → aprovação → publicação → contribuição mock → confirmação → saldo); testes de política RLS. **Dep:** transversal a todos os blocos.

### Grafo de dependências (resumo)

```
B0 → B1 → B2 → B3 → B4 → B5 → B6 → B7
      └─→ B8 → B9 → B10 → B11
B7 depende de B6 e B8
B12, B13 transversais
```

---

## 3. Ordem recomendada e caminho crítico

**Ordem recomendada:**

1. B0 Setup
2. B1 Schema + RLS + seeds
3. B8 Camada de pagamentos (em paralelo a B2, pois só depende de B1)
4. B2 Auth + termos
5. B3 Onboarding
6. B4 Wizard
7. B5 Moderação
8. B6 Página pública + listagem + busca
9. B9 Webhook idempotente
10. B10 Ledger + saldo
11. B7 Contribuição mock (liga B6 + B8 + B9)
12. B11 Dashboard do organizador
13. B12 Observabilidade (endurecido ao longo do caminho)
14. B13 Testes (escritos junto de cada bloco; E2E ao final)

**Caminho crítico:** `B0 → B1 → B2 → B3 → B4 → B5 → B6 → B7`, com o ramo financeiro `B1 → B8 → B9 → B10` convergindo em B7/B11. O wizard (B4) e a cadeia webhook→ledger (B9→B10) são os maiores focos de risco de cronograma. B8 pode ser antecipado logo após B1 para desbloquear B7 e B9 mais cedo.

**Paralelizações seguras:** B8 em paralelo com B2/B3; B12 (observabilidade) e B13 (testes) contínuos; B6 (busca/listagem) pode iniciar sobre dados de seed antes de B5 concluir a UI de moderação.

---

## 4. Critérios de aceite do MVP

O MVP é aceito quando **todos** os itens abaixo forem verdadeiros e cobertos por teste automatizado (E2E onde aplicável):

1. A aplicação inicia (build e runtime) sem erros.
2. Um usuário consegue se cadastrar e autenticar.
3. O usuário conclui o onboarding de organizador.
4. O organizador cria e envia uma vaquinha percorrendo as 10 etapas do wizard.
5. Um admin aprova a vaquinha na fila de moderação.
6. A vaquinha aprovada fica pública.
7. Um visitante encontra a vaquinha (listagem/busca) e faz uma contribuição mock.
8. O webhook mock confirma a contribuição.
9. O ledger recebe os lançamentos correspondentes à confirmação.
10. O progresso da vaquinha é atualizado conforme o valor confirmado.
11. Um webhook duplicado (mesma chave de idempotência) **não** duplica valores no ledger nem no progresso.
12. O organizador vê seu saldo (pendente e disponível) no dashboard.
13. Um usuário comum **não** acessa a área de admin/moderação (bloqueio por RLS e por rota).
14. **Nenhuma** chave/segredo real está versionada no repositório.
15. Pagamentos reais estão desativados (`PAYMENTS_ENABLED=false`) e a UI de saque está desabilitada.

---

## 5. Riscos e mitigações por fase

### Fase 0
- **Risco:** divergência de convenções entre módulos. **Mitigação:** contratos de arquitetura (docs/04) e lint/typecheck em CI desde o commit inicial.
- **Risco:** segredos vazando no repo. **Mitigação:** `.env.example` sem valores, secret scanning em CI, gitignore rígido.

### Fase 1 (MVP)
- **Risco:** webhook não idempotente duplica valores. **Mitigação:** chave de idempotência única em `webhook_events`, transação atômica webhook→ledger, teste dedicado de duplicação (critério 11).
- **Risco:** RLS mal configurada expõe dados ou permite acesso admin indevido. **Mitigação:** políticas por papel testadas com suíte de RLS (critério 13).
- **Risco:** complexidade do wizard de 10 etapas gera rascunhos inconsistentes. **Mitigação:** rascunho persistido com validação Zod por etapa e estado explícito de retomada.
- **Risco:** acoplamento entre domínio e provedor de pagamento. **Mitigação:** interface `PaymentProvider` e seleção por flag; domínio nunca referencia Woovi diretamente (docs/07).
- **Risco:** cálculo de saldo divergente do ledger. **Mitigação:** saldo sempre derivado do ledger append-only; teste de conciliação.

### Fase 2 (Woovi sandbox)
- **Risco:** mudança de payload/assinatura Woovi. **Mitigação:** testes de contrato contra sandbox e camada de mapeamento isolada (docs/09).
- **Risco:** rotação/exposição de chaves. **Mitigação:** runbook de rotação e segredos fora do repo.

### Fase 3 (split/subcontas/KYC/saques)
- **Risco:** inconsistência entre saldo, split e subconta. **Mitigação:** reconciliação automatizada e auditoria por movimentação.
- **Risco:** saque indevido sem KYC. **Mitigação:** gate `KYC_ENABLED` bloqueando saque de não verificado.

### Fase 4 (monetização)
- **Risco:** receita da plataforma misturada com valores da vaquinha. **Mitigação:** segregação contábil no ledger.
- **Risco:** fraude em itens pagos. **Mitigação:** antifraude básico e limites.

### Fase 5 (hardening)
- **Risco:** falhas silenciosas em produção. **Mitigação:** métricas, tracing, alertas e dead-letter de webhooks.
- **Risco:** perda de dados. **Mitigação:** backups testados e plano de DR.

---

## 6. Estimativa relativa de esforço (P/M/G)

Sem datas absolutas; P = pequeno, M = médio, G = grande.

| Bloco | Esforço |
| --- | --- |
| B0 Setup do projeto | M |
| B1 Schema + migrations + RLS + seeds | G |
| B2 Auth + aceite de termos | M |
| B3 Onboarding do organizador | P |
| B4 Wizard de criação (10 etapas) | G |
| B5 Moderação / admin | M |
| B6 Página pública + listagem + busca | M |
| B7 Fluxo de contribuição mock | M |
| B8 Camada de pagamentos | M |
| B9 Webhook pipeline idempotente | G |
| B10 Ledger + cálculo de saldo | G |
| B11 Dashboard do organizador | M |
| B12 Observabilidade básica | P |
| B13 Testes | G |

Blocos G (B1, B4, B9, B10, B13) concentram risco e devem receber revisão prioritária.

---

## 7. Definition of Done por bloco

Um bloco só é considerado concluído quando **todos** os itens abaixo são satisfeitos:

- **Lint:** `pnpm lint` sem erros nem warnings bloqueantes.
- **Typecheck:** `pnpm typecheck` limpo com TS `strict` (sem `any` implícito, sem `@ts-ignore` não justificado).
- **Testes:** unit/integração do bloco verdes; E2E do fluxo afetado verde quando aplicável; cobertura das regras críticas (idempotência, saldo, estados).
- **RLS:** políticas do bloco aplicadas e cobertas por teste — nenhum acesso indevido entre papéis.
- **Auditoria:** ações sensíveis registram trilha de auditoria (actor, evento, referência) e logging estruturado.
- **Feature flags:** caminhos de pagamento respeitam as flags; nada de pagamento real habilitado; UI de saque desabilitada.
- **Segurança:** nenhum segredo versionado; validação Zod na fronteira de entrada.
- **Documentação:** decisões relevantes refletidas em docs/11 quando alterarem contratos.

---

_Escopo desta execução: Fase 0 (fundação) + Fase 1 (MVP mock). Fases 2–5 ficam documentadas e preparadas via feature flags, todas `false`._
