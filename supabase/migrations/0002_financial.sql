-- =====================================================================
-- 0002_financial.sql — Pagamentos, ledger imutável, taxas, saques.
-- Todo valor em centavos (bigint). Nenhuma escrita financeira parte do
-- cliente: apenas service role (webhook/reconciliação) grava aqui.
-- =====================================================================

-- ---------------------------------------------------------------------
-- platform_fees — configuração de taxas VERSIONADA (não hardcode).
-- Uma linha "ativa" por vez; correções criam nova versão.
-- ---------------------------------------------------------------------
create table platform_fees (
  id uuid primary key default gen_random_uuid(),
  version int not null unique,
  platform_fee_bps int not null default 500,        -- 5,00% (basis points)
  gateway_fee_bps int not null default 99,          -- ~0,99% placeholder (PENDENTE)
  gateway_fee_fixed_cents bigint not null default 0,
  min_contribution_cents bigint not null default 500,     -- PENDENTE
  min_withdrawal_cents bigint not null default 2000,      -- PENDENTE
  withdrawal_fee_cents bigint not null default 0,         -- PENDENTE
  chargeback_reserve_bps int not null default 0,          -- PENDENTE
  release_delay_days int not null default 0,              -- carência p/ liberar saldo (PENDENTE)
  is_active boolean not null default false,
  notes text,
  created_at timestamptz not null default now()
);
-- garante no máximo uma versão ativa
create unique index uq_platform_fees_active on platform_fees(is_active) where is_active;

-- ---------------------------------------------------------------------
-- donations — intenção de contribuição (visitante ou logado).
-- Nunca é marcada como paga pelo frontend.
-- ---------------------------------------------------------------------
create table donations (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references campaigns(id) on delete restrict,
  donor_id uuid references profiles(id),            -- null = visitante anônimo
  donor_name text,
  donor_email citext,
  is_anonymous boolean not null default false,
  message text,
  amount_cents bigint not null check (amount_cents > 0),
  currency char(3) not null default 'BRL',
  status donation_status not null default 'created',
  provider payment_provider not null default 'mock',
  consent_terms boolean not null default false,
  terms_version text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  paid_at timestamptz
);
create index idx_donations_campaign on donations(campaign_id);
create index idx_donations_status on donations(status);
create index idx_donations_donor on donations(donor_id);
create trigger trg_donations_updated before update on donations
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------
-- payment_charges — cobrança no provedor (mock/woovi). 1:1 lógico c/ donation.
-- correlation_id = identificador interno idempotente enviado ao gateway.
-- external_charge_id = identificador do gateway.
-- ---------------------------------------------------------------------
create table payment_charges (
  id uuid primary key default gen_random_uuid(),
  donation_id uuid not null references donations(id) on delete restrict,
  provider payment_provider not null,
  correlation_id text not null,                     -- idempotência na criação
  external_charge_id text,                          -- id no gateway
  status donation_status not null default 'created',
  amount_cents bigint not null check (amount_cents > 0),
  brcode text,                                      -- Pix copia-e-cola
  qr_code_image_url text,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index uq_charges_correlation on payment_charges(provider, correlation_id);
create unique index uq_charges_external on payment_charges(provider, external_charge_id)
  where external_charge_id is not null;
create index idx_charges_donation on payment_charges(donation_id);
create trigger trg_charges_updated before update on payment_charges
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------
-- payment_webhook_events — recepção BRUTA de webhooks (idempotência forte).
-- Índice único (provider, event_id) impede processar o mesmo evento 2x.
-- ---------------------------------------------------------------------
create table payment_webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider payment_provider not null,
  event_id text not null,                           -- id único do evento no provedor
  event_type text not null,
  signature_valid boolean not null default false,
  raw_payload jsonb not null,                       -- protegido por RLS (só service role)
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  processing_error text
);
create unique index uq_webhook_event on payment_webhook_events(provider, event_id);
create index idx_webhook_unprocessed on payment_webhook_events(processed_at) where processed_at is null;

-- ---------------------------------------------------------------------
-- payment_events — eventos normalizados derivados dos webhooks (auditoria)
-- ---------------------------------------------------------------------
create table payment_events (
  id uuid primary key default gen_random_uuid(),
  charge_id uuid references payment_charges(id) on delete set null,
  webhook_event_id uuid references payment_webhook_events(id) on delete set null,
  provider payment_provider not null,
  type text not null,                               -- ex: charge_completed
  amount_cents bigint,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index idx_payment_events_charge on payment_events(charge_id);

-- ---------------------------------------------------------------------
-- payment_refunds
-- ---------------------------------------------------------------------
create table payment_refunds (
  id uuid primary key default gen_random_uuid(),
  charge_id uuid not null references payment_charges(id) on delete restrict,
  provider payment_provider not null,
  correlation_id text not null,
  external_refund_id text,
  amount_cents bigint not null check (amount_cents > 0),
  reason text,
  status text not null default 'requested',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index uq_refunds_correlation on payment_refunds(provider, correlation_id);
create index idx_refunds_charge on payment_refunds(charge_id);
create trigger trg_refunds_updated before update on payment_refunds
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------
-- ledger_entries — LIVRO-RAZÃO IMUTÁVEL (fonte oficial de saldo).
-- Cada evento financeiro cria um GRUPO de lançamentos (group_id).
-- amount_cents é SEMPRE positivo; a direção é dada por entry_type/account.
-- UPDATE/DELETE são bloqueados por trigger — correções via compensação.
-- ---------------------------------------------------------------------
create table ledger_entries (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null,                           -- agrupa lançamentos do mesmo evento
  campaign_id uuid references campaigns(id) on delete restrict,
  account ledger_account not null,
  entry_type ledger_entry_type not null,
  direction smallint not null check (direction in (-1, 1)),  -- +1 credita a conta, -1 debita
  amount_cents bigint not null check (amount_cents >= 0),
  currency char(3) not null default 'BRL',
  donation_id uuid references donations(id) on delete restrict,
  charge_id uuid references payment_charges(id) on delete restrict,
  refund_id uuid references payment_refunds(id) on delete restrict,
  withdrawal_id uuid,                               -- FK adicionada após withdrawal_requests
  webhook_event_id uuid references payment_webhook_events(id) on delete restrict,
  -- idempotência: impede lançar 2x o mesmo componente do mesmo evento
  idempotency_key text not null,
  memo text,
  created_by uuid references profiles(id),          -- null = sistema (webhook)
  created_at timestamptz not null default now()
);
create unique index uq_ledger_idempotency on ledger_entries(idempotency_key);
create index idx_ledger_campaign on ledger_entries(campaign_id);
create index idx_ledger_group on ledger_entries(group_id);
create index idx_ledger_account on ledger_entries(account);
create index idx_ledger_donation on ledger_entries(donation_id);

-- Imutabilidade: nenhum UPDATE/DELETE em lançamentos.
create or replace function ledger_block_mutation()
returns trigger language plpgsql as $$
begin
  raise exception 'ledger_entries é imutável: use lançamentos compensatórios (op=%).', tg_op;
end $$;
create trigger trg_ledger_no_update before update on ledger_entries
  for each row execute function ledger_block_mutation();
create trigger trg_ledger_no_delete before delete on ledger_entries
  for each row execute function ledger_block_mutation();

-- ---------------------------------------------------------------------
-- withdrawal_requests — solicitação de saque (desativada por flag nesta fase)
-- ---------------------------------------------------------------------
create table withdrawal_requests (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references campaigns(id) on delete restrict,
  organizer_id uuid not null references profiles(id) on delete restrict,
  amount_cents bigint not null check (amount_cents > 0),
  fee_cents bigint not null default 0,
  net_cents bigint not null default 0,
  status withdrawal_status not null default 'requested',
  -- dados bancários NUNCA expostos publicamente (RLS)
  bank_payload jsonb,
  reviewed_by uuid references profiles(id),
  reviewed_at timestamptz,
  rejection_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_withdrawals_campaign on withdrawal_requests(campaign_id);
create index idx_withdrawals_status on withdrawal_requests(status);
create trigger trg_withdrawals_updated before update on withdrawal_requests
  for each row execute function set_updated_at();

-- agora que a tabela existe, liga o FK do ledger
alter table ledger_entries
  add constraint fk_ledger_withdrawal
  foreign key (withdrawal_id) references withdrawal_requests(id) on delete restrict;

-- ---------------------------------------------------------------------
-- payouts — execução do pagamento do saque no provedor (futuro)
-- ---------------------------------------------------------------------
create table payouts (
  id uuid primary key default gen_random_uuid(),
  withdrawal_id uuid not null references withdrawal_requests(id) on delete restrict,
  provider payment_provider not null,
  correlation_id text not null,
  external_payout_id text,
  amount_cents bigint not null check (amount_cents > 0),
  status text not null default 'created',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index uq_payouts_correlation on payouts(provider, correlation_id);
create trigger trg_payouts_updated before update on payouts
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------
-- ledger_accounts — catálogo/descrição das contas (referência)
-- (o saldo vem da soma de ledger_entries, não daqui)
-- ---------------------------------------------------------------------
create table ledger_accounts (
  account ledger_account primary key,
  description text not null,
  is_campaign_scoped boolean not null default false
);
insert into ledger_accounts(account, description, is_campaign_scoped) values
  ('gateway_clearing', 'Caixa mantido no gateway', false),
  ('gateway_fee_expense', 'Despesa com taxa do gateway', false),
  ('platform_revenue', 'Receita da plataforma', false),
  ('campaign_pending', 'Saldo do organizador em carência', true),
  ('campaign_available', 'Saldo do organizador disponível p/ saque', true),
  ('campaign_withdrawn', 'Valor sacado pelo organizador', true),
  ('chargeback_reserve', 'Reserva para chargebacks', false);
