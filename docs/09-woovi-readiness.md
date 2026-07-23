# 09 — Prontidão para Woovi / OpenPix

> Woovi e OpenPix são a **mesma plataforma/gateway**; os portais de documentação são espelhados.
> Referência de API: `https://developers.openpix.com.br/en/api` (OpenAPI 3.0).
> **Nada aqui foi ativado.** Este documento consolida o que a documentação oficial diz, para uma
> futura habilitação em sandbox. Antes de implementar qualquer contrato, **confirme na referência**.

## 1. Autenticação
- Credencial única **AppID** (não é OAuth). Header `Authorization: <AppID>` — **AppID puro, sem `Bearer`** (todos os exemplos oficiais em curl enviam o AppID direto).
- Obtenção: painel → **API/Plugins** → Nova API/Plugin (tipo API para backend) → 2FA → copiar AppID.
- Não depende de habilitação comercial.

## 2. Ambiente sandbox
- Conta **separada** em `https://app.woovi-sandbox.com/`. Credenciais de produção não valem no sandbox.
- Base URL API: sandbox `https://api.woovi-sandbox.com` · produção `https://api.openpix.com.br`.

## 3. Cobrança (charge) Pix
- `POST /api/v1/charge` (páginas de fluxo antigas usam `/api/openpix/v1/charge` — **confirmar caminho**).
- Request: `correlationID` (string, idempotente), `value` (**inteiro em centavos**), `comment`, `customer` (`name/email/phone/taxID`, opcional), `expiresIn` (confirmar unidade).
- Response: objeto `charge` com `status`, `value`, `correlationID`, `transactionID`, `brCode` (copia-e-cola), `qrCodeImage`, `paymentLinkUrl`, `expiresDate`, `createdAt`. **Confirmar nomes exatos na referência.**

## 4. Consulta / expiração
- Consultar: `GET /api/v1/charge/{id}` (aceita `correlationID` ou id).
- Listar: `GET /api/v1/charge` · Deletar: `DELETE /api/v1/charge/{id}` · Alterar expiração: `PATCH /api/v1/charge/{id}`.

## 5. Webhooks (crítico)
- Cadastro: painel (API/Plugins → Novo Webhook) ou API `POST /api/v1/webhook` (+ `GET`/`DELETE`).
- **Eventos** (nomes exatos): `OPENPIX:CHARGE_CREATED`, `OPENPIX:CHARGE_COMPLETED` (paga), `OPENPIX:CHARGE_EXPIRED`, `OPENPIX:CHARGE_COMPLETED_NOT_SAME_CUSTOMER_PAYER`, `OPENPIX:TRANSACTION_RECEIVED`, eventos de reembolso (`PIX_TRANSACTION_REFUND_*`), de movimento/saída (`OPENPIX:MOVEMENT_*`), de disputa (`OPENPIX:DISPUTE_*`) e de conta/subconta (`ACCOUNT_REGISTER_*`).
- **Payload** (ex. paga): campos de topo `event`, `charge` (`status:"COMPLETED"`, `value`, `correlationID`, `transactionID`, `fee`, `customer`, datas) e `pix` (`endToEndId`, `transactionID`, `value`, dados do pagador).
- **Validação de assinatura — dois métodos documentados:**
  1. **RSA-SHA256 (principal):** header `x-webhook-signature`, algoritmo `sha256WithRSAEncryption`, verificado contra o **corpo BRUTO** com a **chave pública** fornecida pela OpenPix (base64 → PEM). Assimétrico, sem segredo compartilhado.
  2. **HMAC-SHA1 (alternativo):** header `X-OpenPix-Signature`, HMAC `sha1` em base64, usando a **HMAC Secret** de cada webhook (obtida no painel).
- ⚠️ Sempre validar sobre o **raw body exato** (sem re-serializar o JSON).
- Nosso `WooviPaymentProvider.verifyWebhook` já implementa o método **HMAC-SHA1**; o RSA fica como TODO de hardening (precisa da chave pública oficial no momento da ativação).

## 6. Reembolso
- `POST /api/v1/charge/{id}/refund` (request `correlationID`, `value` em centavos, `comment`). Consulta: `GET /api/v1/charge/{id}/refund`.

## 7. Split
- No ato da criação: array `splits` no `POST /api/v1/charge` (`pixKey`, `value`, `splitType`).
- Tipos: `SPLIT_SUB_ACCOUNT` (confirmado); `SPLIT_PARTNER`/`SPLIT_INTERNAL_TRANSFER` referenciados.
- **Habilitação comercial:** split p/ subconta exige Subconta habilitada; Split Partner exige ativação via **suporte comercial**.

## 8. Subcontas
- `POST /api/v1/subaccount` (`pixKey`, `name`); `GET /api/v1/subaccount`; detalhes/saldo `GET /api/v1/subaccount/{id}`; transferência `POST /api/v1/subaccount/{id}/transfer`.
- Valores de split p/ subconta são **transações virtuais** (debitados na origem só no saque da subconta).
- **Exige funcionalidade Subconta habilitada.**

## 9. Saque / transferência (payout)
- Saque de subconta: `POST /api/v1/subaccount/{id}/withdraw` (`value` em centavos).
- Conta principal: `POST /api/v1/payment` (+ `/approve`, `GET /{id}`), `POST /api/v1/transfer` — **exigem "Request Access" / liberação**.

## 10. KYC / onboarding de recebedor
- Documentado no contexto de **Woovi Partner**: `POST /api/v1/partner/company`, `POST /api/v1/partner/application`; fluxo pré-cadastro → validação por e-mail/SMS → conclusão de dados. Eventos `ACCOUNT_REGISTER_APPROVED/REJECTED/PENDING`.
- **Exige ativação da parceria pelo suporte.**

## 11. Idempotência
- A API é **idempotente por `correlationID`** (não há header `Idempotency-Key` separado). Reenviar o mesmo `correlationID` na criação não duplica — retorna a entidade existente. Derivamos o `correlationID` do `donation.id`.

## 12. Rate limits e versionamento
- Versão `v1` no caminho; referência publicada como OpenAPI 3.0.
- **Rate limits oficiais: não confirmados** na documentação. Tratar HTTP 429 com backoff; confirmar com o suporte.

---

## Lacunas / não confirmado
1. Caminho exato do charge (`/api/v1/charge` vs `/api/openpix/v1/charge`).
2. Unidade de `expiresIn`.
3. Nomes exatos de todos os campos de response da charge (`identifier` vs `transactionID` vs `qrCodeImage`).
4. Semântica completa de `SPLIT_PARTNER`/`SPLIT_INTERNAL_TRANSFER`.
5. Se reembolso exige habilitação.
6. Rate limits oficiais.
7. **Chave pública RSA do webhook:** obter da página oficial no momento da implementação (não hardcodar).
8. Necessidade (ou não) da API GraphQL para algum recurso.

## Checklist para habilitar (fase futura — NÃO agora)
- [ ] Criar conta sandbox, gerar AppID, preencher `WOOVI_APP_ID` no `.env.local` (nunca no repo).
- [ ] Confirmar endpoints/campos contra a referência OpenAPI.
- [ ] Implementar verificação RSA-SHA256 do webhook com a chave pública oficial.
- [ ] Cadastrar webhook apontando para `/api/webhooks/woovi` (rota a criar, análoga à mock).
- [ ] Testes com chamadas HTTP **mockadas** (sem rede real).
- [ ] Solicitar habilitação comercial de subconta/split/payout/partner conforme necessidade.
- [ ] Só então: `PAYMENTS_ENABLED=true`, `WOOVI_ENABLED=true` no ambiente sandbox.

Fontes: `developers.openpix.com.br/en/api`, `/docs/apis/getting-started-api`, `/docs/intro/test-environment`, `/docs/concepts/idempotence`, `/docs/webhook/seguranca/*`, `developers.woovi.com/docs/webhook/*`, `/docs/subaccount/*`, `/docs/split/split-partner`, `/docs/partnerships/*`.
