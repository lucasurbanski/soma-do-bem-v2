# 11 — Decisões em Aberto

> Lista de decisões que **dependem do negócio**. Os valores abaixo são **placeholders** já
> configurados no sistema (tabela `platform_fees` / `platform_settings` / `feature_flags`), **não**
> regras definitivas. Nada aqui deve ser tratado como final até validação.

## Financeiro / taxas

| # | Decisão | Placeholder atual | Onde vive |
|---|---|---|---|
| 1 | **Percentual da plataforma** sobre doações | 5% (500 bps) | `platform_fees.platform_fee_bps` |
| 2 | **Taxa do gateway** (Woovi Pix) | ~0,99% (99 bps) + fixo R$0,00 | `platform_fees.gateway_fee_bps/fixed` — confirmar com contrato Woovi |
| 3 | **Base de incidência** da taxa da plataforma (bruto vs. líquido) | sobre o **bruto** | `fees.ts` (a revisar) |
| 4 | **Prazo de liberação** do saldo (carência) | 0 dias (libera direto) | `platform_fees.release_delay_days` |
| 5 | **Valor mínimo de contribuição** | R$ 5,00 | `platform_fees.min_contribution_cents` |
| 6 | **Valor mínimo de saque** | R$ 20,00 | `platform_fees.min_withdrawal_cents` |
| 7 | **Taxa de saque** | R$ 0,00 | `platform_fees.withdrawal_fee_cents` |
| 8 | **Reserva para chargebacks** | 0 bps | `platform_fees.chargeback_reserve_bps` |
| 9 | **Política de reembolso** (prazo, quem pode, parcial/total) | não definida | a definir |

## Incentivos / promoções (observados no legado)

| # | Decisão | Placeholder | Flag |
|---|---|---|---|
| 10 | **Primeira contribuição da plataforma** ("R$ 10 ao criar") | desativado | `PLATFORM_SEED_DONATION_ENABLED` |
| 11 | **Primeiro saque sem taxa** | não implementado | — |
| 12 | **Corações pagos** (R$ 0,99) | desativado | `HEARTS_ENABLED` |
| 13 | **Emojis pagos** (R$ 0,99) | desativado | `EMOJIS_ENABLED` |
| 14 | **Destaque pago** da vaquinha (R$ 4,99) | desativado | `HIGHLIGHT_ENABLED` |

> Corações/emojis/destaque e a "primeira contribuição" são **possibilidades futuras**, apenas
> documentadas e controladas por flag — fora do escopo desta entrega (ver `docs/07`).

## Vaquinha / moderação

| # | Decisão | Placeholder | Onde |
|---|---|---|---|
| 15 | **Prazo máximo** da vaquinha | 0 = sem prazo | `platform_settings.campaign_max_days` |
| 16 | **Publicação automática vs. moderada** | moderada | `platform_settings.auto_publish=false` |
| 17 | Critérios objetivos de aprovação/rejeição | informais | a definir (checklist de moderação) |
| 18 | Categorias oficiais definitivas | 10 do staging | `campaign_categories` |

## KYC / recebimento / legal

| # | Decisão | Situação |
|---|---|---|
| 19 | **Exigência de KYC** (quando/como) | pendente — `KYC_ENABLED=false` |
| 20 | **Uso de split ou subcontas** Woovi (e habilitação comercial) | pendente — flags off, exige suporte Woovi |
| 21 | **Responsável legal pelo recebimento** dos recursos (plataforma como intermediária vs. repasse direto) | **decisão jurídica/fiscal crítica** — define split, KYC e emissão fiscal |
| 22 | Emissão de **nota fiscal / comprovantes** | pendente |
| 23 | Retenção e **anonimização** de dados (LGPD) — janelas por tabela | esboço em `docs/06`; validar prazos legais |

## Produto / gateway

| # | Decisão | Situação |
|---|---|---|
| 24 | Gateway definitivo (staging usa **Asaas**; alvo **Woovi**) | confirmar contrato/tarifas Woovi antes de ativar |
| 25 | Métodos de pagamento (só Pix vs. cartão/boleto) | foco em Pix; cartão/boleto futuros |
| 26 | Login social (Google OAuth visto no staging) | a habilitar no Supabase Auth quando decidido |
| 27 | Rotação dos segredos do Supabase de DEV compartilhados no chat | **recomendado antes de produção** |

---

**Como registrar decisões:** ao fechar um item, atualizar o valor na tabela correspondente
(`platform_fees` cria **nova versão**, não edita a ativa) e marcar aqui como decidido, com data.
