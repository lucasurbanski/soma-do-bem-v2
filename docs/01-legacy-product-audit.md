# 01 — Auditoria de Produto do Legado

Data: 2026-07-23
Fontes desta auditoria:
1. Mockups locais (`Group 439/440/441/629.png`) e wireframe `dashboard-vaquinhas.html`.
2. **Exploração funcional do staging** `https://staging.apoieaqui.com.br/` via navegador real (páginas públicas apenas; sem login; sem contornar autenticação).
3. Documentação oficial do gateway Woovi/OpenPix (ver `docs/09-woovi-readiness.md`).

> Nota de acesso: o staging **bloqueia crawlers de IA** (`robots.txt` nega ClaudeBot/GPTBot; requisições via fetcher retornam HTTP 403). A exploração foi feita com o **navegador do usuário** (user-agent normal), que não é bloqueado. O domínio de produção `apoieaqui.com.br` **não resolve em DNS** — o produto vive só no staging.

---

## 1. Rotas encontradas no staging (páginas públicas)

| Rota | Tela | Status | Observações |
|---|---|---|---|
| `/` | Homepage | ✅ Funcional | Bate com `Group 629.png`. |
| `/causes` | Listagem/busca de vaquinhas | ✅ Funcional | Filtros: nome, cidade (Localização), ordenação. |
| `/causes/{slug}` | Página pública da vaquinha | ✅ Funcional | Ex.: `/causes/ajude-a-testar-o-site-7c8f61d2`. Slug = título + hash de 8 hex. |
| `/checkout?causeId={uuid}` | Checkout/contribuição | ✅ Funcional | A vaquinha tem **UUID interno** além do slug. Bate com `Group 441.png`. |
| `/about` | Sobre | ✅ (link) | Não inspecionada em detalhe. |
| `/login` | Login | ✅ Funcional | E-mail + senha + "Lembrar login" + **Google OAuth** + "Esqueci minha senha". |
| `/register` | Criar conta | ✅ (link) | Alcançável de `/login`. |
| `/forgot-password` | Recuperação de senha | ✅ (link) | Alcançável de `/login`. |
| `/causes/create` | Criar vaquinha | 🔒 Protegida | **Redireciona para `/login`** quando não autenticado → proteção de rota confirmada. |
| "Como funciona" (menu) | — | ⚠️ Placeholder | `href="#"` — **não implementada**. |
| "Saiba mais" (banner R$10) | — | ⚠️ Placeholder | `href="#"`. |

## 2. Mapa de navegação

- **Header (global):** logo → `/`, busca (`Pesquisar`), `Causas` → `/causes`, `Como funciona` (#), `Sobre` → `/about`, `Entrar` → `/login`, `Criar vaquinha` → `/causes/create`.
- **Homepage → seções:** Hero (CTA `Dê o primeiro passo agora` → `/login`) · faixa de benefícios · "Histórias em destaque" (grid de cards) · "Histórias com mais corações somados" · "O impacto acontecendo em tempo real" (feed animado) · FAQ "Você é novo por aqui?" · CTA final · footer.
- **Vaquinha → checkout:** botão `Quero contribuir` → `/checkout?causeId={uuid}`.
- **Login:** ↔ `/register`, ↔ `/forgot-password`, Google OAuth.

## 3. Regras de negócio observadas

### Confirmadas no staging (texto real)
- **Promoção "primeira contribuição da plataforma":** *"Esta vaquinha ganhou a primeira contribuição no valor de R$ 10 do Apoie aqui ao ser criada."*
- **Faixa de benefícios:** "Crie sua vaquinha grátis", "Receba R$ 10 ao criar sua vaquinha", "Primeiro saque sem taxa".
- **Destaque pago:** "Quero ajudar a destacar essa vaquinha por **R$ 4,99**" — texto: *"Ao comprar corações, você dá mais destaque para essa vaquinha em nosso site e também ajuda causas animais na cidade de Joinville."*
- **Emojis pagos:** 6 emojis (❤️ 🌹 🙏 ⭐ 😍 👏) a **R$ 0,99** cada, adicionáveis à doação.
- **Reações na vaquinha:** contadores de ❤️ ⭐ 👏 🌹 🙏 ("corações somados"/"corações recebidos").
- **Resumo da doação:** Doação + "Destacar vaquinha + ONG" + Emoji = Total.
- **Disclaimer legal:** maioridade (18+), aceite de "Termos, Taxas e Prazos", promessa de não-spam.
- **Categorias reais:** Saúde, Educação, Animais, Meio Ambiente, Esportes, Cultura, Tecnologia, Comunidade, Emergência, Outros.
- **Ordenação da listagem:** `created_at` (Mais recentes), `title` (Título), `goal_amount` (Meta).
- **Localização** = campo de **cidade** (texto livre) na listagem.

### Do wireframe do Admin (não confirmadas no staging público)
- **Taxa da plataforma sobre doações: 5%.**
- Coração e emoji contabilizados como receita da plataforma (R$0,99).
- Filtro/viés geográfico para SC/SP/RJ/PR.

> Todas as taxas/percentuais/promoções acima são tratadas como **decisões de negócio pendentes** (ver `docs/11-open-decisions.md`) — o rebuild as coloca em **configurações versionadas com feature flags**, não como constantes fixas.

## 4. Formulários e fluxos

### Login (`/login`)
- Campos: e-mail, senha, checkbox "Lembrar login".
- Alternativas: Google OAuth ("Continuar com Google"); "Esqueci minha senha"; "Criar conta".

### Checkout (`/checkout?causeId=…`)
- Campos: **Valor da doação**, **Nome completo**, **CPF**, **E-mail**, **WhatsApp**, **CEP**.
- Forma de pagamento: **Pix** (única opção visível no staging; o wireframe admin também cita cartão/boleto como dados históricos).
- Add-ons: destaque pago (R$4,99), emojis (R$0,99 cada).
- Resumo dinâmico + botão "Contribuir".
- ⚠️ O checkout **não exige login** (doação anônima/como visitante é permitida) — "Já doou? Faça login" é opcional.

### Criação de vaquinha
- Rota protegida; o fluxo detalhado (multi-etapas) não é visível sem login. O rebuild o especifica em `docs/02-screen-map.md` (10 etapas).

## 5. Gateway de pagamento

- **Staging/mockup usa ASAAS** — selo "Aqui sua doação está em segurança" + logo Asaas no checkout (`Group 441.png`), confirmado no texto do checkout ("Aqui sua doação está em segurança").
- **O rebuild mira Woovi/OpenPix** (Pix). Isso é uma **troca de gateway**, absorvida pela abstração `PaymentProvider` (`docs/07`), com `MockPaymentProvider` no MVP e `WooviPaymentProvider` desativado por flag.

## 6. Inconsistências e funcionalidades incompletas/demonstrativas

1. **"Como funciona" não existe** (`href="#"`) — item de menu principal sem página. O rebuild cria a página institucional.
2. **FAQ com respostas placeholder:** as três "Dúvidas" da home têm o **mesmo texto genérico** repetido. Conteúdo real é decisão de negócio.
3. **História com Lorem Ipsum / texto repetido:** a vaquinha de teste tem descrição "Ajude a testar o site" repetida N vezes; os mockups usam Lorem Ipsum. São demonstrativos.
4. **"O impacto em tempo real"** parece um **feed fabricado** (nomes cíclicos "Lucas U. / João G. …" repetidos) — provável animação decorativa, não dados reais.
5. **Reações com contadores altos** (❤️298 etc.) numa vaquinha com R$0 arrecadado e criada para teste — indicam **dados semeados/fake** para demonstração.
6. **Divergência de categorias** entre wireframe admin (Saúde/Emergência/Educação/Animais/Comunidade/Esporte/Projeto pessoal) e staging (10 categorias, inclui Meio Ambiente/Cultura/Tecnologia/Outros). O rebuild adota a lista do **staging** como base (mais recente), configurável em `campaign_categories`.
7. **Monetização por corações/emojis/destaque** está viva no staging mas é **explicitamente fora de escopo** desta execução — apenas documentada e protegida por feature flag.
8. **Cartão e boleto** aparecem no wireframe admin, mas o checkout do staging só oferece Pix. O rebuild foca em **Pix** (via Woovi), tratando cartão/boleto como futuros.

## 7. O que o rebuild preserva vs. muda

**Preserva (produto/UX):**
- Estrutura de navegação e telas públicas (home, listagem, vaquinha, checkout).
- Identidade "apoie aqui" (rosa/coração), tom acolhedor, ênfase em histórias e progresso da meta.
- Slug público + identificador interno para vaquinhas.
- Auth por e-mail/senha (+ opção OAuth Google como futuro).

**Muda (arquitetura/robustez):**
- Gateway ASAAS → abstração com Mock + Woovi (desativado).
- `arrecadado` deixa de ser número solto → **derivado do ledger imutável**.
- Status em português no wireframe → **modelo canônico em inglês** (`docs/05`).
- Regras financeiras → **100% server-side, idempotentes, auditáveis**, taxas em **configuração versionada**.
- Corações/emojis/destaque → **feature-flagged**, fora do MVP.
