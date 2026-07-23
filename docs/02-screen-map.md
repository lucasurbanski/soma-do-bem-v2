# 02 — Mapa de Telas

Legenda de origem:
- 🟢 **Confirmada** — existe evidência direta (mockup PNG local ou wireframe HTML).
- 🟡 **Inferida** — deduzida do fluxo/navegação, sem mockup direto.
- 🔵 **A criar** — necessária para o MVP desta execução, sem referência visual.
- ⚪ **Não encontrada** — mencionada/esperada, mas sem evidência (fica para fases futuras).

Legenda de escopo:
- **[MVP]** entra nesta execução (mock, sem pagamento real).
- **[FUT]** fora do escopo atual — apenas documentada.

---

## Área pública

| Tela | Origem | Escopo | Evidência / Notas |
|---|---|---|---|
| Homepage | 🟢 Confirmada | [MVP] | `Group 629.png`. Hero + faixa de benefícios + histórias em destaque + mais corações + impacto em tempo real + FAQ + footer. |
| Listagem/Busca de vaquinhas | 🟢 Confirmada | [MVP] | `Group 440.png`. Filtros: Categoria, Localização, Arrecadação (ordenação); botão Buscar. |
| Resultados de busca (grid com paginação) | 🟡 Inferida | [MVP] | Deriva da listagem; grid de cards visto na home. |
| Página pública da vaquinha | 🟢 Confirmada | [MVP] | `Group 439.png`. Capa, progresso da meta, organizador, história, últimas doações, reações, denunciar. |
| Checkout / Contribuição (mock) | 🟢 Confirmada | [MVP] | `Group 441.png`. Valor, Nome, CPF, E-mail, WhatsApp, CEP, Pix, destaque pago, emojis, resumo. **Selo ASAAS** (será Woovi/mock). |
| Estado "aguardando pagamento" (QR/copia-e-cola Pix) | 🟡 Inferida | [MVP] | Necessário pós-criação da cobrança mock. |
| Recibo / confirmação de contribuição | 🟡 Inferida | [MVP] | Necessário; confirmado só via webhook/reconciliação server-side. |
| "Ver todas as doações" | 🟢 Confirmada | [MVP] | Botão em `Group 439.png`. |
| Denunciar vaquinha (form) | 🟡 Inferida | [MVP] | Link "Denunciar esta vaquinha" em `Group 439.png`. |
| Como funciona | 🟢 Confirmada (link) | [MVP] | Item de menu + footer. Conteúdo institucional. |
| Sobre / Quem somos | 🟢 Confirmada (link) | [MVP] | Menu + footer. |
| Taxas e prazos | 🟢 Confirmada (link) | [MVP] | Footer. Conteúdo depende de decisões pendentes → placeholders claros. |
| Dúvidas frequentes (FAQ) | 🟢 Confirmada | [MVP] | Bloco "Você é novo por aqui?" na home + link footer. |
| Termos de uso | 🟢 Confirmada (link) | [MVP] | Footer + disclaimer do checkout. Versionado (aceite). |
| Política de privacidade | 🟢 Confirmada (link) | [MVP] | Footer. |
| Blog | 🟢 Confirmada (link) | [FUT] | Footer. Fora do MVP. |
| Fale conosco / Contato | 🟢 Confirmada (link) | [MVP] | Footer (form simples ou e-mail). |
| Trabalhe conosco | 🟢 Confirmada (link) | [FUT] | Footer. |
| Imprensa | 🟢 Confirmada (link) | [FUT] | Footer. |
| Estados de loading / vazio / 404 / erro | 🔵 A criar | [MVP] | Exigidos pelo escopo. |

## Autenticação

| Tela | Origem | Escopo | Notas |
|---|---|---|---|
| Login ("Entrar") | 🟢 Confirmada (link) | [MVP] | Menu "Entrar"; checkout "Já doou? Faça login". |
| Cadastro | 🟡 Inferida | [MVP] | Necessário; sem mockup. |
| Recuperação de acesso | 🔵 A criar | [MVP] | Escopo exige. |
| Aceite de termos versionado | 🔵 A criar | [MVP] | Escopo exige; disclaimer visto no checkout. |
| Perfil básico do usuário | 🔵 A criar | [MVP] | Escopo exige. |

## Onboarding do organizador

| Tela | Origem | Escopo | Notas |
|---|---|---|---|
| Onboarding (nome, CPF, nascimento, telefone, endereço, titularidade) | 🔵 A criar | [MVP] | Sem mockup; escopo detalha os campos. Sem dados bancários nesta fase. |
| Status de onboarding / preparação KYC | 🔵 A criar | [MVP] | Estados: `not_started`/`pending`/`approved`/... |

## Criação de vaquinha (multi-etapas)

| Etapa | Origem | Escopo | Notas |
|---|---|---|---|
| 1. Informações básicas | 🔵 A criar | [MVP] | CTA "Criar vaquinha" confirmado (header). Fluxo em wizard. |
| 2. Categoria | 🔵 A criar | [MVP] | Categorias do wireframe. |
| 3. Localização | 🔵 A criar | [MVP] | Estados BR. |
| 4. Meta | 🔵 A criar | [MVP] | Valor em centavos. |
| 5. Título | 🔵 A criar | [MVP] | Gera slug único. |
| 6. História | 🔵 A criar | [MVP] | Rich text simples. |
| 7. Imagem de capa | 🔵 A criar | [MVP] | Upload validado (tipo/tamanho, nome aleatório). |
| 8. Beneficiário | 🔵 A criar | [MVP] | Próprio ou terceiro (declaração de vínculo). |
| 9. Pré-visualização | 🔵 A criar | [MVP] | Reusa a página pública. |
| 10. Envio para análise | 🔵 A criar | [MVP] | Muda status → `pending_review`. |

## Área do organizador (dashboard)

| Tela | Origem | Escopo | Notas |
|---|---|---|---|
| Minhas vaquinhas (lista + status) | 🔵 A criar | [MVP] | Inclui rascunhos. |
| Detalhe/edição da vaquinha | 🔵 A criar | [MVP] | Edição conforme status. |
| Métricas básicas | 🟡 Inferida | [MVP] | Progresso, doações mock. |
| Financeiro: saldo pendente / disponível / histórico | 🔵 A criar | [MVP] | **Derivado do ledger.** |
| Saque (desativado com explicação) | 🔵 A criar | [MVP] | `WITHDRAWALS_ENABLED=false`. |

## Admin

| Tela | Origem | Escopo | Notas |
|---|---|---|---|
| Login/gate por papel | 🟢 Confirmada | [MVP] | Wireframe `dashboard-vaquinhas.html` (sessão `admin@apoieaqui.com.br`). |
| Visão geral (KPIs) | 🟢 Confirmada | [MVP] | Wireframe aba "Visão geral". Versão MVP simplificada. |
| Fila de análise / Vaquinhas | 🟢 Confirmada | [MVP] | Aba "Vaquinhas": Ver/Aprovar/Pausar/Suspender/Rejeitar. |
| Detalhe da vaquinha (modal) | 🟢 Confirmada | [MVP] | Modal do wireframe. |
| Denúncias | 🟢 Confirmada | [MVP] | Status `denunciada` + "Denunciar" na pág. pública. |
| Usuários | 🟢 Confirmada | [MVP] | Aba "Usuários" (suspender/reativar). |
| Doações (mock) | 🟢 Confirmada | [MVP] | Aba "Doações". |
| Eventos de webhook (mock) | 🔵 A criar | [MVP] | Escopo exige visualização. |
| Ledger / Transações | 🟢 Confirmada | [MVP] | Aba "Transações" = livro-razão. |
| Audit log | 🔵 A criar | [MVP] | Escopo exige. |
| Saques (fila) | 🟢 Confirmada | [FUT/MVP-view] | Aba "Saques" no wireframe; **ações reais desativadas** (WITHDRAWALS_ENABLED=false). Visualização apenas. |
| Performance | 🟢 Confirmada | [FUT] | Aba "Performance"; não crítica ao MVP. |
| Corações / Emojis (vendas) | 🟢 Confirmada | [FUT] | Abas do wireframe; monetização futura por feature flag. |

## Telas de monetização futura (apenas documentadas)

| Tela | Origem | Escopo |
|---|---|---|
| Compra de corações / emojis / destaque pago | 🟢 Confirmada (checkout/pág.) | [FUT] — feature flags `HEARTS_ENABLED`, `EMOJIS_ENABLED`, `HIGHLIGHT_ENABLED` |
| "Primeira contribuição da plataforma (R$10)" | 🟢 Confirmada (home/pág.) | [FUT] — `PLATFORM_SEED_DONATION_ENABLED` |

---

### Resumo de cobertura do MVP
- **Confirmadas por mockup:** homepage, listagem, página da vaquinha, checkout, admin (9 abas).
- **A criar (sem referência visual) para o MVP:** cadastro, recuperação, perfil, onboarding, wizard de criação (10 etapas), dashboard do organizador, eventos de webhook, audit log, estados de erro/vazio.
- **Fora do escopo (documentadas):** blog, trabalhe conosco, imprensa, saques reais, corações/emojis/destaque pagos, performance analytics avançada.
