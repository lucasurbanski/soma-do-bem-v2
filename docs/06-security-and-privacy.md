# 06 — Segurança e Privacidade

Este documento descreve os princípios e controles de **segurança** e **privacidade** da plataforma Soma do Bem — uma plataforma de vaquinhas (crowdfunding) construída sobre **Next.js (App Router)** e **Supabase** (Postgres, Auth, Storage). A entidade responsável é a **Soma do Bem**, sediada em **Joinville/SC**, e o tratamento de dados pessoais segue a **LGPD** (Lei nº 13.709/2018).

Referências cruzadas:
- `docs/04-architecture.md` — arquitetura de aplicação, camadas server-side e fronteiras de confiança.
- `docs/05-domain-model.md` — entidades, tabelas, colunas e relacionamentos.
- `docs/07-payment-architecture.md` — fluxo de pagamento (mock no MVP), webhook, ledger e reconciliação.

> Convenção de terminologia: mantemos em inglês os termos técnicos consagrados (Server Actions, Route Handlers, RLS, service role, ledger, webhook, rate limiting, etc.); o texto explicativo é em Português do Brasil.

---

## 0. Princípios canônicos (não negociáveis)

Estes princípios são **decisões de arquitetura já adotadas** e valem para todo o código. Qualquer PR que os viole deve ser rejeitado.

1. **Autorização é SEMPRE server-side.** Toda decisão de "pode ou não pode" acontece em **Server Components**, **Server Actions** ou **Route Handlers**. O cliente (browser) nunca é fonte de verdade para autorização. Esconder um botão no front não é controle de acesso.
2. **RLS habilitado em TODAS as tabelas.** Nenhuma tabela fica com Row Level Security desligado. Nenhuma policy permite que um usuário comum altere **saldo, pagamento, taxa ou status financeiro** diretamente. Essas escritas só ocorrem via **service role**, em código de servidor (webhook/reconciliação).
3. **A service role NUNCA vai para o browser.** A chave `SUPABASE_SERVICE_ROLE_KEY` só existe em código server-side. O cliente usa exclusivamente a chave `anon` combinada com RLS.
4. **Dinheiro em centavos (inteiros).** Nada de `float`. Toda regra financeira (valor, taxa, total) é calculada no servidor. Operações financeiras usam **idempotência** e **transações de banco**.
5. **Nenhuma confirmação vinda do frontend marca doação como paga.** Somente **webhook** ou **reconciliação server-side** transiciona uma doação para `paid`.
6. **Ledger financeiro imutável.** Lançamentos do ledger não sofrem `UPDATE` nem `DELETE`. Correções são feitas por **lançamentos compensatórios** (estorno/ajuste), preservando a trilha completa.

---

## 1. Modelo de autenticação (Supabase Auth)

### 1.1 Métodos
- **E-mail/senha** (padrão). Senhas nunca trafegam nem são armazenadas pela aplicação — o Supabase Auth cuida do hashing (bcrypt/scrypt) e do fluxo.
- **OAuth Google** como opção adicional de login/cadastro.
- Recuperação de senha por e-mail com token de uso único e expiração.

### 1.2 Sessão
- Sessão gerenciada por cookies HTTP-only via `@supabase/ssr`. O `access_token` (JWT) e o `refresh_token` ficam em cookies **HttpOnly, Secure, SameSite=Lax**, inacessíveis a JavaScript do cliente.
- Renovação de token feita no middleware/server, nunca expondo o refresh token ao browser.

### 1.3 Proteção de rotas
Duas camadas complementares:

1. **Middleware (`middleware.ts`)** — primeira barreira. Refresca a sessão e redireciona usuários não autenticados para `/entrar` quando a rota é privada (ex.: `/painel`, `/admin`). O middleware faz *coarse gating* (autenticado x não autenticado), não decisão fina de papel.
2. **Checagem server-side de papel** — segunda barreira, obrigatória. Toda página/ação privada revalida a sessão e o papel **no servidor** (Server Component/Server Action), consultando `user_roles`. O middleware sozinho **não** é suficiente: rotas de dados sensíveis sempre revalidam.

```ts
// Exemplo: guard reutilizável em Server Component / Server Action
import { createServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function requireRole(allowed: Role[]) {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser(); // valida o JWT no servidor
  if (!user) redirect("/entrar");

  const { data: roles } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id);

  const has = roles?.some((r) => allowed.includes(r.role));
  if (!has) redirect("/403");
  return { user, roles };
}
```

> Observação: usar sempre `supabase.auth.getUser()` (que valida o token no servidor Auth), **não** `getSession()` para decisões de autorização, pois `getSession()` confia no cookie sem revalidar.

---

## 2. Modelo de autorização e papéis (RBAC)

### 2.1 Papéis
Os papéis são armazenados na tabela `user_roles` (`user_id`, `role`, `granted_by`, `granted_at`). Um usuário pode ter mais de um papel.

| Papel | Descrição |
|---|---|
| `visitor` | Não autenticado. Apenas leitura pública. |
| `donor` | Usuário autenticado que doa. Vê as próprias doações e recibos. |
| `organizer` | Cria e gerencia as **próprias** campanhas. |
| `moderator` | Analisa denúncias, aprova/reprova campanhas, oculta conteúdo abusivo. |
| `financial_operator` | Opera reconciliação e visualiza ledger/pagamentos (leitura ampla financeira; escrita só via processos server-side controlados). |
| `support` | Atendimento: consulta status de doações/campanhas com dados **mascarados**; sem poder financeiro. |
| `admin` | Acesso administrativo pleno, sob auditoria de todas as ações. |

### 2.2 Matriz resumida de permissões

| Ação | visitor | donor | organizer | moderator | support | financial_operator | admin |
|---|:--:|:--:|:--:|:--:|:--:|:--:|:--:|
| Ver campanhas `active` (público) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Criar campanha | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ✅ |
| Editar **a própria** campanha | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ✅ |
| Editar campanha de terceiros | ❌ | ❌ | ❌ | ⚠️ (moderação) | ❌ | ❌ | ✅ |
| Fazer doação | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Ver **as próprias** doações/recibos | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ |
| Ver ledger/pagamentos (leitura ampla) | ❌ | ❌ | ❌ | ❌ | ⚠️ (mascarado) | ✅ | ✅ |
| Alterar saldo/status financeiro | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ (só service role) |
| Moderar denúncias | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ✅ |
| Ver `audit_logs` | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Gerir papéis de usuários | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |

Legenda: ✅ permitido · ❌ negado · ⚠️ permitido com escopo restrito. A célula "Alterar saldo/status financeiro" é ❌ para **todos** — inclusive admin — via cliente; qualquer escrita financeira ocorre apenas por código server-side com service role (ver §3 e §13).

### 2.3 Onde a autorização acontece
A matriz acima é **aplicada no servidor** (RLS + checagem de papel em Server Actions), não apenas na UI. A UI usa os papéis somente para exibir/ocultar elementos — nunca como controle de segurança.

---

## 3. Row Level Security (RLS)

### 3.1 Filosofia
- **RLS ligado em todas as tabelas**, com policy padrão de negar tudo e liberação explícita por caso.
- O cliente autenticado usa a chave `anon`; **cada** consulta passa pelas policies. Assim, mesmo que um bug de código omita um filtro `WHERE user_id = ...`, o banco ainda protege os dados.
- **Escritas financeiras não têm policy de `UPDATE`/`INSERT` para usuário.** `donations` mudam de status, `payments` e `ledger_entries` são criados/atualizados **apenas** pela service role, que **ignora** RLS por definição. Isso é intencional: torna impossível, por construção, um cliente marcar algo como pago ou mexer em saldo.

### 3.2 Exemplos de policies

**Leitura pública de campanhas ativas:**
```sql
alter table campaigns enable row level security;

create policy "public_read_active_campaigns"
on campaigns for select
using ( status = 'active' );
```

**Organizer só vê e edita as próprias campanhas:**
```sql
create policy "organizer_read_own_campaigns"
on campaigns for select
using ( organizer_id = auth.uid() );

create policy "organizer_update_own_campaigns"
on campaigns for update
using ( organizer_id = auth.uid() )
with check ( organizer_id = auth.uid() );

-- Note: nenhuma policy permite alterar colunas financeiras derivadas
-- (ex.: total_raised_cents) — esse valor é mantido pelo ledger/servidor.
```

**Doações: dono lê a própria; sem `UPDATE` para o cliente:**
```sql
alter table donations enable row level security;

create policy "donor_read_own_donations"
on donations for select
using ( donor_id = auth.uid() );

-- INSERT do rascunho de doação pode ser permitido com status forçado 'pending';
-- porém a transição para 'paid' NÃO tem policy de UPDATE (só service role).
create policy "donor_insert_pending_donation"
on donations for insert
with check ( donor_id = auth.uid() and status = 'pending' );
-- (sem policy de UPDATE/DELETE => cliente não consegue alterar status)
```

**Pagamentos e ledger: leitura restrita ao dono; escrita só service role:**
```sql
alter table payments enable row level security;
alter table ledger_entries enable row level security;

create policy "read_own_payments"
on payments for select
using ( donor_id = auth.uid() );

-- ledger é imutável e privado: sem SELECT público, sem UPDATE, sem DELETE.
create policy "read_own_ledger"
on ledger_entries for select
using ( donor_id = auth.uid() );
-- Nenhuma policy de INSERT/UPDATE/DELETE => somente service role escreve.
```

**Audit logs: só admin:**
```sql
alter table audit_logs enable row level security;

create policy "admin_read_audit_logs"
on audit_logs for select
using (
  exists (
    select 1 from user_roles ur
    where ur.user_id = auth.uid() and ur.role = 'admin'
  )
);
-- Escrita de audit_logs também é feita via service role no servidor.
```

> Regra de ouro: **se a tabela envolve dinheiro ou status financeiro, ela não recebe policy de escrita para o cliente.** Ver `docs/05-domain-model.md` para a lista completa de tabelas e `docs/07-payment-architecture.md` para o fluxo do ledger.

---

## 4. Validação de entrada com Zod

Toda **borda de entrada** (Server Actions e Route Handlers) valida o payload com **Zod** antes de qualquer lógica de negócio. Nada de confiar em tipos do TypeScript em runtime — TS não valida dados externos.

```ts
import { z } from "zod";

const CreateDonationSchema = z.object({
  campaignId: z.string().uuid(),
  amountCents: z.number().int().positive().max(100_000_00), // teto sanitário
  displayName: z.string().trim().min(1).max(80),
  message: z.string().trim().max(500).optional(),
  isAnonymous: z.boolean().default(false),
});

export async function createDonation(raw: unknown) {
  const input = CreateDonationSchema.parse(raw); // lança em dado inválido
  // ...regra de negócio e cálculo de valores acontecem no servidor
}
```

Princípios:
- Validar **tipo, formato, faixa e tamanho** (comprimento máximo de strings evita abuso/DoS).
- Valores monetários chegam como inteiros em centavos; o servidor **recalcula** taxa e total (ver §13).
- CPF, CEP, e-mail e telefone têm schemas dedicados com normalização (remoção de máscara) antes de persistir.
- Mensagens de erro para o cliente são genéricas; detalhes ficam nos logs internos (sem dados sensíveis, ver §9).

---

## 5. Rate limiting

Endpoints sensíveis recebem **rate limiting** para mitigar brute force, enumeração e abuso.

| Endpoint / ação | Chave | Limite (MVP) |
|---|---|---|
| Login (`/entrar`) | IP + e-mail | 5 tentativas / 15 min |
| Cadastro | IP | 5 / hora |
| Recuperação de senha | IP + e-mail | 3 / hora |
| Criação de cobrança mock | user_id + IP | 10 / min |
| Webhook de pagamento | IP de origem + assinatura | throttle defensivo + verificação |

Estratégia:
- **MVP:** implementação **in-memory** (mapa com janela deslizante/token bucket) no processo do servidor. Simples e suficiente para baixo volume e instância única.
- **Nota de evolução:** em ambiente multi-instância/serverless, migrar para **Redis/Upstash** (rate limit distribuído), pois memória local não é compartilhada entre instâncias. Deixar a interface do limiter abstraída para trocar o backend sem mexer nos handlers.

```ts
// Interface abstrata para permitir troca in-memory -> Upstash no futuro
interface RateLimiter {
  check(key: string): Promise<{ ok: boolean; retryAfterSec?: number }>;
}
```

Respostas ao exceder o limite usam **HTTP 429** com `Retry-After`, sem revelar se um e-mail/usuário existe (ver §12).

---

## 6. CSRF

- **Server Actions do Next.js** já possuem proteção nativa contra CSRF (verificação de origin e mecanismo de action id assinada). Preferir Server Actions para mutações vindas de formulários da própria aplicação.
- **Route Handlers `POST`/`PUT`/`DELETE`** que não passam por Server Actions devem validar **origin/referer** e, quando aplicável, um **token anti-CSRF** ou header customizado exigido (ex.: `x-requested-with`). Cookies de sessão são `SameSite=Lax`, o que já reduz o vetor.
- **Webhook** de pagamento é exceção: não usa sessão de usuário; a autenticidade vem da **verificação de assinatura** do provedor (ver §14 e `docs/07-payment-architecture.md`), não de CSRF token.

---

## 7. Security headers

Configurados via `next.config.js` (`headers()`) e reforçados no middleware quando necessário. Aplicados a todas as respostas.

| Header | Valor (base) | Objetivo |
|---|---|---|
| `Content-Security-Policy` | `default-src 'self'; img-src 'self' data: https://<storage-supabase>; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self' https://<projeto>.supabase.co; frame-ancestors 'none'` | Mitiga XSS e injeção de recursos. Ajustar hosts do Supabase Storage/Auth. |
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` | Força HTTPS (HSTS). |
| `X-Frame-Options` | `DENY` | Anti-clickjacking (redundante com `frame-ancestors`). |
| `X-Content-Type-Options` | `nosniff` | Impede MIME sniffing. |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Limita vazamento de URL/dados na navegação. |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=(), payment=()` | Desliga APIs de browser não usadas. |

```js
// next.config.js (trecho)
const securityHeaders = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  // CSP montada dinamicamente para incluir nonce em scripts, quando aplicável
];

module.exports = {
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};
```

> A CSP deve começar **restritiva** e ser afrouxada apenas com hosts explícitos (Supabase, domínio de mídia). Preferir `nonce` a `'unsafe-inline'` para scripts.

---

## 8. Upload seguro (Supabase Storage)

Uploads (capa de campanha, imagens de história) são validados **no servidor** antes de ir ao Storage.

Regras:
- **Tipo permitido:** apenas imagens `image/jpeg`, `image/png`, `image/webp`. Validar por **magic bytes** (assinatura do arquivo), não confiar só na extensão nem no `Content-Type` do cliente.
- **Tamanho máximo:** limite de **5 MB** por arquivo, checado no servidor (e reforçado por policy de bucket).
- **Nome aleatório:** o arquivo é salvo com **UUID** (`crypto.randomUUID()`) + extensão derivada do tipo real. Nunca usar o nome original enviado pelo usuário — isso elimina **path traversal** e colisão.
- **Sem path traversal:** o path é construído no servidor a partir de valores controlados (`campaigns/{campaignId}/{uuid}.webp`); qualquer `../` ou caractere de controle é rejeitado.
- **Bucket com policies:** bucket de imagens públicas é somente-leitura pública para GET; upload só via server-side (service role) após validação. Buckets com conteúdo privado exigem URL assinada com expiração.

```ts
const ALLOWED = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
]);
const MAX_BYTES = 5 * 1024 * 1024;

async function validateAndBuildPath(campaignId: string, file: File, sniffedMime: string) {
  const ext = ALLOWED.get(sniffedMime);
  if (!ext) throw new Error("Tipo de arquivo não permitido");
  if (file.size > MAX_BYTES) throw new Error("Arquivo excede 5MB");
  return `campaigns/${campaignId}/${crypto.randomUUID()}.${ext}`; // nome aleatório
}
```

---

## 9. Logs sem dados sensíveis

- **Nunca** logar CPF, senha, token, dados bancários, e-mail/telefone completos ou payloads de pagamento crus.
- **Mascaramento de CPF** ao exibir em telas administrativas/suporte e ao registrar em logs: `***.***.***-**` (ou parcial `123.***.***-45` quando estritamente necessário para conferência).
- Dados bancários (chave Pix, conta) **jamais** aparecem em consultas públicas nem em logs; ficam em tabela privada acessível só a papéis financeiros via server-side.
- Logs de erro carregam **IDs de correlação** (request id, donation id) em vez de dados pessoais, permitindo rastrear sem expor.

```ts
export function maskCpf(_cpf: string): string {
  return "***.***.***-**"; // padrão para logs e telas não financeiras
}
```

---

## 10. Segregação de dados públicos vs privados

- **Colunas/áreas privadas** — nunca entram em nenhum payload público: `cpf`, `birth_date`, `phone`, `address`, dados bancários (`pix_key`, conta), e-mail.
- **Views públicas / seleção explícita de colunas:** endpoints públicos (página da campanha, lista de doações) usam **views** ou `select` de colunas seguras (ex.: `display_name`, `amount_cents`, `message`, `created_at`), nunca `select *`.
- Doação anônima exibe rótulo genérico ("Doador anônimo"); mesmo sem anonimato, só o **nome de exibição** é público — o vínculo com a identidade real fica em tabela privada.
- A segregação é reforçada por **RLS** (§3): mesmo um erro de query no servidor não expõe coluna privada em contexto de cliente `anon`.

---

## 11. Controle de acesso administrativo

- Toda rota `/admin/*` passa por **gate de papel** server-side (`requireRole(["admin"])` / papel específico) além do middleware.
- **Auditoria obrigatória:** toda ação administrativa (aprovar/reprovar campanha, alterar papel, forçar reconciliação, ocultar conteúdo) grava um registro em `audit_logs` com `actor_id`, `action`, `target`, `metadata`, `created_at`, `ip`. A escrita é via service role no servidor.
- `audit_logs` é **append-only** (sem UPDATE/DELETE) e legível apenas por `admin` (policy da §3).
- Ações destrutivas ou financeiras exigem confirmação explícita e, quando possível, **segregação de funções** (quem opera não é quem audita).

---

## 12. Prevenção de enumeração de usuários

- **Mensagens genéricas** em login, cadastro e recuperação de senha:
  - Login inválido → "E-mail ou senha inválidos." (sem dizer qual dos dois).
  - Recuperação → "Se este e-mail estiver cadastrado, enviaremos as instruções." (mesma resposta exista ou não a conta).
  - Cadastro com e-mail já usado → não revelar; disparar fluxo de "verifique seu e-mail" idêntico.
- **Timing constante:** normalizar o tempo de resposta (ex.: executar sempre um hash de senha dummy quando o usuário não existe) para não vazar existência por diferença de latência.
- Rate limiting (§5) reforça a proteção contra sondagem em massa.

---

## 13. Prevenção de alteração de valores pelo frontend

- O cliente **apenas sugere** o valor da doação. O servidor é a **única** autoridade sobre `amount_cents`, `fee_cents` e `total_cents`.
- A taxa é calculada por regra server-side (ver `docs/07-payment-architecture.md`); o servidor **ignora** qualquer taxa/total enviado pelo cliente e recalcula.
- Valores em **centavos inteiros**; arredondamento e limites são aplicados no servidor.
- A cobrança (mock) é criada no servidor com os valores recalculados; o front recebe de volta os valores oficiais para exibição, sem poder reescrevê-los.

```ts
// O cliente manda só amountCents; taxa e total são derivados no servidor.
function computeCharge(amountCents: number) {
  const feeCents = calcFee(amountCents);       // regra oficial no servidor
  const totalCents = amountCents + feeCents;    // inteiros, sem float
  return { amountCents, feeCents, totalCents };
}
```

---

## 14. Idempotência e transações

- **Webhook idempotente:** cada evento do provedor tem um **event id único**. A tabela `payment_events` (ou equivalente) tem **índice único** sobre esse id; um evento repetido é detectado e ignorado sem reprocessar.
- **Processamento em transação:** marcar a doação como `paid`, criar o `payment` e inserir os `ledger_entries` acontece dentro de **uma transação de banco** — ou tudo confirma, ou nada. Isso evita estados parciais.
- **Reconciliação** periódica cobre webhooks perdidos, sempre server-side e idempotente (não duplica lançamentos por causa das chaves únicas).

```sql
-- Deduplicação de eventos de pagamento por id do provedor
create unique index if not exists uq_payment_events_provider_event
  on payment_events (provider, provider_event_id);
```

```ts
// Pseudo-fluxo do webhook (service role, transação, idempotente)
async function handleWebhook(evt: PaymentEvent) {
  await db.transaction(async (tx) => {
    const inserted = await tx.insertIgnore("payment_events", {
      provider: evt.provider,
      provider_event_id: evt.id, // índice único => 2ª vez não faz nada
    });
    if (!inserted) return; // já processado: idempotente

    await tx.update("donations", { status: "paid" }, { id: evt.donationId });
    await tx.insert("payments", { /* ... */ });
    await tx.insert("ledger_entries", { /* lançamento imutável */ });
  });
}
```

Detalhes completos do fluxo estão em `docs/07-payment-architecture.md`.

---

## 15. LGPD — Privacidade e proteção de dados

A Soma do Bem é **controladora** dos dados pessoais tratados na plataforma. Contato do encarregado (DPO) publicado na Política de Privacidade.

### 15.1 Base legal
- **Execução de contrato / procedimentos preliminares** (art. 7º, V): dados necessários para processar a doação (CPF para emissão fiscal/antifraude, e-mail para recibo).
- **Consentimento** (art. 7º, I): comunicações de marketing/newsletter, quando aplicável — sempre opt-in e revogável.
- **Cumprimento de obrigação legal/regulatória** (art. 7º, II): retenção de registros financeiros e fiscais.
- **Legítimo interesse** (art. 7º, IX): prevenção a fraude e segurança, com balanceamento documentado.

### 15.2 Minimização
- Coletar **apenas o necessário** para o propósito. Campos como endereço completo só quando exigidos pela regra fiscal/entrega.
- Não solicitar dado sensível (art. 5º, II) sem necessidade e base legal específica.

### 15.3 Retenção
- Dados de doação/financeiros retidos pelo prazo legal/fiscal aplicável (ex.: registros contábeis) e depois **anonimizados**.
- Dados de conta inativa e dados de marketing têm prazos menores; consentimentos revogados cessam o tratamento correspondente.
- Tabela de retenção detalhada mantida junto à Política de Privacidade (governança), revisada periodicamente.

### 15.4 Direitos do titular
Confirmação de tratamento, acesso, correção, portabilidade, anonimização, e informação sobre compartilhamento. Canal de atendimento ao titular publicado; prazos de resposta conforme a ANPD.

### 15.5 Exclusão/anonimização — mecanismo FUTURO (roadmap)
No MVP, solicitações são atendidas **manualmente** por processo interno auditado. O mecanismo **automatizado** é roadmap:

- **Anonimização** (preferida sobre exclusão física) preservando integridade financeira/contábil e imutabilidade do ledger:
  - `users` / `profiles`: substituir `name`, `cpf`, `email`, `phone`, `birth_date`, `address` por valores anonimizados/hash irreversível; desativar login.
  - `donations`: manter `amount_cents`, `status`, `created_at` (necessários para contabilidade), mas anonimizar `display_name`/`message` e desvincular identidade.
  - `payments` / `ledger_entries`: **não** apagar (imutável e obrigação legal); apenas desvincular dados diretamente identificáveis quando permitido, mantendo a trilha financeira.
  - `audit_logs`: preservados por obrigação de segurança; identificadores minimizados conforme retenção.
- Toda operação de anonimização gera registro em `audit_logs`, roda via **service role** em transação e respeita as chaves únicas para não quebrar reconciliação.
- Documento de mapeamento "campo → ação (anonimizar/manter/hash)" versionado junto ao domínio (`docs/05-domain-model.md`).

### 15.6 Compartilhamento e subprocessadores
- **Supabase** (banco/auth/storage) e o provedor de pagamento são **operadores/subprocessadores**; regidos por contrato. Lista de subprocessadores publicada.
- Transferência internacional (se o provedor hospedar fora do Brasil) tratada conforme cláusulas/garantias adequadas.

---

## 16. Gestão de segredos

- **Variáveis de ambiente** para todo segredo: `SUPABASE_SERVICE_ROLE_KEY`, chaves do provedor de pagamento, segredo de assinatura de webhook, etc.
- **`.env` fora do git:** `.env*` no `.gitignore`. Nunca commitar segredos. Fornecer `.env.example` só com nomes e placeholders.
- **Separação por prefixo:** apenas variáveis `NEXT_PUBLIC_*` vão ao browser. A service role **nunca** tem esse prefixo — está **somente** em código server-side (§0.3).
- **Segredos em produção** ficam no cofre da plataforma de deploy (ex.: variáveis de ambiente do host/Vercel), não em arquivos.
- **Rotação:** procedimento documentado para rotacionar service role, chaves do provedor e segredo do webhook periodicamente e em caso de suspeita de vazamento; rotação não deve exigir downtime (chaves com sobreposição quando o provedor permitir).
- **Menor privilégio:** cada integração usa a credencial de menor escopo possível; a service role é reservada aos fluxos que realmente precisam contornar RLS (webhook/reconciliação/admin server-side).

---

## Checklist de revisão (pré-merge)

- [ ] Toda tabela nova tem **RLS habilitado** e policies revisadas.
- [ ] Nenhuma policy permite ao cliente escrever em saldo/pagamento/taxa/status financeiro.
- [ ] `SUPABASE_SERVICE_ROLE_KEY` não aparece em código de cliente nem em variável `NEXT_PUBLIC_*`.
- [ ] Toda Server Action/Route Handler valida entrada com **Zod**.
- [ ] Autorização checada **server-side** (não só UI/middleware).
- [ ] Valores monetários recalculados no servidor, em centavos inteiros.
- [ ] Webhook idempotente (índice único) e transacional.
- [ ] Uploads validam tipo/tamanho e usam nome UUID.
- [ ] Nenhum dado sensível em logs; CPF mascarado.
- [ ] Endpoints sensíveis com rate limiting.
- [ ] Security headers presentes.
- [ ] Segredos fora do git; `.env.example` atualizado.
