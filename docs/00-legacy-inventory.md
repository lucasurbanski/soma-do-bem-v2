# 00 — Inventário do Legado

> Documento de auditoria. Lista **tudo** que existia na pasta antes de qualquer código novo.
> Nenhum arquivo original foi apagado, movido ou sobrescrito durante o inventário.

Data da auditoria: 2026-07-23
Diretório auditado: `C:\Users\lucas\documents\soma-do-bem`

## 1. Arquivos encontrados (raiz)

| Arquivo | Tipo | Tamanho | Natureza |
|---|---|---|---|
| `Group 439.png` | Imagem PNG | ~558 KB | **Screenshot/mockup** — Página pública da vaquinha (detalhe da campanha) |
| `Group 440.png` | Imagem PNG | ~86 KB | **Screenshot/mockup** — Cabeçalho da listagem/busca de vaquinhas |
| `Group 441.png` | Imagem PNG | ~98 KB | **Screenshot/mockup** — Formulário de contribuição/doação (checkout) |
| `Group 629.png` | Imagem PNG | ~2,49 MB | **Screenshot/mockup** — Homepage completa (hero, destaques, FAQ, footer) |
| `dashboard-vaquinhas.html` | HTML + CSS + JS inline | ~68 KB | **Wireframe funcional** do painel administrativo, com dados mock em JS |

> Não há: `package.json`, código-fonte de produção, `node_modules`, migrations, `.env`, repositório git,
> protótipos Figma exportados, nem qualquer backend. A pasta contém **apenas referências de produto/design**.

## 2. Credenciais e dados sensíveis

- **Nenhum arquivo de credencial** (`.env`, chaves, tokens, service roles) foi encontrado.
- O `dashboard-vaquinhas.html` contém apenas **dados fictícios gerados por JavaScript** (`Math.random()`), incluindo:
  - nomes fictícios, e-mails no padrão `nome.sobrenome@email.com`;
  - dados bancários simulados (ex.: `Banco Itaú • Ag 1234 • CC 12345-6`) — **não são reais**, são gerados aleatoriamente em runtime.
- Conclusão: **não há segredo real a proteger** nesta pasta. Ainda assim, os dados bancários/CPF simulados servem de alerta sobre quais campos precisarão de proteção (mascaramento, RLS) na plataforma nova.

## 3. `dashboard-vaquinhas.html` — dissecação técnica

Arquivo autocontido (single-file), sem dependências externas, sem libs (gráficos em SVG puro). Serve como **wireframe de alta fidelidade do Admin**.

### Design tokens (CSS `:root`) — reaproveitáveis
```
--bg:#FAF6F4   --panel:#ffffff   --text:#2A211F   --muted:#8C7A74
--accent:#EF4444 (vermelho/rosa CTA)   --accent-dark:#C93131   --accent-bg:#FDEBEA
--heart:#FF6F91 (rosa coração)   --ok:#1E9E64   --warn:#D98A11   --bad:#DC3545   --info:#3B6FD9
--radius:14px
```
> Observação: o mockup público (PNGs) usa um **rosa/magenta** mais saturado como cor de marca; o admin usa
> vermelho `#EF4444`. A identidade final deve padronizar o rosa (ver `docs/02-screen-map.md` e design).

### Seções (abas) do Admin
1. **Visão geral** — cards de KPI, filtros (período/estado/faixa de arrecadação), receita da plataforma por canal (taxa 5% + corações + emojis), gráficos por hora/dia, saques pendentes, últimas transações.
2. **Performance** — taxa de conversão, top 10 (7 dias), vaquinhas **sem nenhuma arrecadação**.
3. **Vaquinhas** — tabela com busca/filtros (status, categoria, estado), ações: Ver / Aprovar / Pausar / Encerrar.
4. **Saques** — tabela com dados bancários, ações: Ver / Aprovar / Rejeitar / Marcar pago.
5. **Doações** — filtros por método (pix/cartão/boleto) e status (confirmada/pendente/estornada); ação Estornar.
6. **Corações** — vendas de "coração" a R$ 0,99/un.
7. **Emojis** — vendas de "emoji" a R$ 0,99/un.
8. **Transações** — livro-razão consolidado (doação, saque, taxa, coração, emoji, estorno).
9. **Usuários** — organizadores/doadores; ação Suspender/Reativar.

### Regras de negócio embutidas no código do wireframe
- **Taxa da plataforma sobre doações: 5%** (`d.valor*0.05`).
- **Coração e emoji: R$ 0,99** por unidade (o autor anotou que assumiu preço do coração igual ao do emoji — decisão pendente).
- Status de vaquinha usados: `ativa`, `sob_analise`, `pausada`, `encerrada`, `denunciada`.
- Status de doação: `confirmada`, `pendente`, `estornada`.
- Status de saque: `pendente`, `aprovado`, `pago`, `rejeitado`.
- Status de usuário: `ativo`, `suspenso`.
- Categorias: Saúde, Emergência, Educação, Animais, Comunidade, Esporte, Projeto pessoal.
- Viés geográfico para **SC/SP/RJ/PR** (empresa catarinense).

> ⚠️ Estes status/regras são do **wireframe** e serão **remapeados** para o modelo canônico em inglês
> definido em `docs/05-domain-model.md` (ex.: `ativa` → `active`, `sob_analise` → `pending_review`,
> `denunciada` não é um status mas uma flag/relação de denúncias).

## 4. Imagens (mockups públicos)

Analisadas visualmente. Detalhamento completo em `docs/01-legacy-product-audit.md` e `docs/02-screen-map.md`.

| Arquivo | Tela | Elementos-chave |
|---|---|---|
| `Group 629.png` | **Homepage** | Hero "Crie sua vaquinha e nós fazemos a primeira contribuição para você"; faixa de benefícios (criar grátis / R$10 ao criar / 1º saque sem taxa); "Histórias em destaque"; "Histórias com mais corações somados"; "O impacto acontecendo em tempo real"; FAQ; footer com links institucionais. |
| `Group 440.png` | **Listagem/Busca** | Headline "Histórias que precisam de você estão aqui"; filtros: Categoria, Localização, Arrecadação (ordenação); botão Buscar. |
| `Group 439.png` | **Página da vaquinha** | Título; imagem de capa com "98 corações recebidos"; card de progresso (Arrecadado R$ / meta / % / "Quero contribuir"); banner "ganhou a primeira contribuição de R$10"; autor; barra de reações (coração/emojis com contador); "Conheça a história" (com Lorem Ipsum — é mockup); "Últimas doações recebidas"; "Denunciar esta vaquinha". |
| `Group 441.png` | **Checkout/Contribuição** | Campos: Valor, Nome completo, CPF, E-mail, WhatsApp, CEP; Forma de pagamento **Pix**; opção "Destacar essa vaquinha por R$ 4,99"; grade de emojis a R$0,99; "Resumo da sua doação" (Doação + Destacar + Emoji = Total); botão "Contribuir"; disclaimer de maioridade/termos. **Selo do gateway: ASAAS.** |

## 5. Achados críticos para a reconstrução

1. **Gateway atual é ASAAS**, não Woovi/OpenPix (visível no checkout `Group 441.png`). O rebuild mira Woovi/OpenPix → há **divergência de gateway** a tratar na camada de abstração de pagamentos (ver `docs/07-payment-architecture.md`).
2. **Entidade legal: "Soma do Bem"** (footer da homepage: "empresa orgulhosamente catarinense, nascida em Joinville"). "Apoie Aqui" é a marca. O nome do diretório (`soma-do-bem`) confirma.
3. **Modelo de monetização** vai além da taxa sobre doações: corações pagos, emojis pagos e destaque pago — todos itens que o escopo atual manda **apenas documentar como futuros** e proteger por feature flag.
4. **Promoções** ("R$10 ao criar", "primeiro saque sem taxa", "primeira contribuição da plataforma") são **decisões de negócio pendentes** (ver `docs/11-open-decisions.md`), não regras fixas.
5. O wireframe do Admin trata `arrecadado` como um **número no objeto da campanha** — na plataforma nova esse valor será **cache derivado do ledger**, nunca a fonte oficial.
6. Textos "Lorem Ipsum" nos mockups confirmam que a **história** e alguns blocos são apenas demonstrativos.

## 6. Limitações desta auditoria

- Os PNGs são **imagens estáticas**: não revelam estados de hover, validações client-side, mensagens de erro, fluxo multi-etapas de criação de vaquinha, telas autenticadas nem responsividade real.
- A exploração das páginas **públicas do staging** (`https://staging.apoieaqui.com.br/`) e da **documentação do gateway** foi conduzida à parte; resultados e eventuais indisponibilidades estão registrados em `docs/01-legacy-product-audit.md` (staging) e `docs/09-woovi-readiness.md` (gateway).
