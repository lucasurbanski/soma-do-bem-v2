-- =====================================================================
-- 0001_schema.sql — Apoie Aqui (Soma do Bem)
-- Modelo de dados base. Dinheiro SEMPRE em centavos (bigint).
-- Fonte oficial de saldo = ledger (ver 0003). campaign.raised_amount_cents
-- é apenas cache derivado, nunca a fonte financeira.
-- =====================================================================

create extension if not exists pgcrypto;
create extension if not exists citext;

-- ---------------------------------------------------------------------
-- ENUMs (status canônicos — inglês no código)
-- ---------------------------------------------------------------------
create type app_role as enum (
  'donor', 'organizer', 'moderator', 'admin', 'financial_operator', 'support'
);

create type campaign_status as enum (
  'draft', 'pending_review', 'active', 'paused', 'rejected', 'completed', 'closed', 'suspended'
);

create type donation_status as enum (
  'created', 'pending', 'paid', 'expired', 'failed', 'refunded', 'partially_refunded', 'chargeback'
);

create type withdrawal_status as enum (
  'requested', 'under_review', 'approved', 'processing', 'paid', 'rejected', 'canceled'
);

create type kyc_status as enum (
  'not_started', 'pending', 'approved', 'rejected', 'expired'
);

create type payment_provider as enum ('mock', 'woovi');

create type beneficiary_kind as enum ('self', 'third_party');

create type report_status as enum ('open', 'reviewing', 'resolved', 'dismissed');

-- Tipos de lançamento do ledger (imutável)
create type ledger_entry_type as enum (
  'donation_gross',
  'gateway_fee',
  'platform_fee',
  'campaign_credit',
  'hold',
  'hold_release',
  'refund',
  'chargeback',
  'chargeback_reserve',
  'chargeback_reserve_release',
  'withdrawal_hold',
  'withdrawal_paid',
  'adjustment'
);

-- Conta contábil de cada lançamento
create type ledger_account as enum (
  'gateway_clearing',      -- caixa mantido no gateway (asset plataforma)
  'gateway_fee_expense',   -- despesa com taxa do gateway
  'platform_revenue',      -- receita da plataforma
  'campaign_pending',      -- passivo p/ organizador, ainda em carência
  'campaign_available',    -- passivo p/ organizador, liberado p/ saque
  'campaign_withdrawn',    -- valor já sacado
  'chargeback_reserve'     -- reserva p/ chargebacks
);

-- ---------------------------------------------------------------------
-- Helper: updated_at
-- ---------------------------------------------------------------------
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ---------------------------------------------------------------------
-- profiles (1:1 com auth.users)
-- ---------------------------------------------------------------------
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  display_name text,
  avatar_url text,
  email citext,
  phone_e164 text,                    -- privado
  onboarding_status kyc_status not null default 'not_started',
  is_suspended boolean not null default false,
  suspended_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create trigger trg_profiles_updated before update on profiles
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------
-- user_roles (N papéis por usuário)
-- ---------------------------------------------------------------------
create table user_roles (
  user_id uuid not null references profiles(id) on delete cascade,
  role app_role not null,
  granted_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  primary key (user_id, role)
);

-- ---------------------------------------------------------------------
-- addresses (privado)
-- ---------------------------------------------------------------------
create table addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  postal_code text,                   -- CEP
  street text,
  number text,
  complement text,
  district text,
  city text,
  state_uf char(2),
  country char(2) not null default 'BR',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_addresses_user on addresses(user_id);
create trigger trg_addresses_updated before update on addresses
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------
-- organizer_profiles (dados sensíveis do organizador — privado)
-- CPF nunca exposto em consulta pública.
-- ---------------------------------------------------------------------
create table organizer_profiles (
  user_id uuid primary key references profiles(id) on delete cascade,
  legal_name text,
  cpf_digits char(11),                -- só dígitos; NUNCA em payload público
  birth_date date,
  phone_e164 text,
  address_id uuid references addresses(id),
  beneficiary_declaration beneficiary_kind not null default 'self',
  onboarding_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_organizer_updated before update on organizer_profiles
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------
-- organizer_kyc (status/preparação — sem dados bancários nesta fase)
-- ---------------------------------------------------------------------
create table organizer_kyc (
  user_id uuid primary key references profiles(id) on delete cascade,
  status kyc_status not null default 'not_started',
  provider payment_provider,
  external_kyc_id text,               -- id no provedor (futuro)
  reviewed_by uuid references profiles(id),
  reviewed_at timestamptz,
  rejection_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_kyc_updated before update on organizer_kyc
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------
-- campaign_categories
-- ---------------------------------------------------------------------
create table campaign_categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- campaigns
-- ---------------------------------------------------------------------
create table campaigns (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  organizer_id uuid not null references profiles(id) on delete restrict,
  category_id uuid references campaign_categories(id),
  title text not null,
  story text,
  cover_image_path text,              -- caminho no Storage
  goal_amount_cents bigint not null check (goal_amount_cents >= 0),
  city text,
  state_uf char(2),
  status campaign_status not null default 'draft',
  -- CACHE (não-oficial): valor derivado do ledger p/ leitura rápida.
  raised_amount_cents bigint not null default 0,
  donors_count int not null default 0,
  published_at timestamptz,
  reviewed_by uuid references profiles(id),
  reviewed_at timestamptz,
  rejection_reason text,
  ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index idx_campaigns_status on campaigns(status);
create index idx_campaigns_organizer on campaigns(organizer_id);
create index idx_campaigns_category on campaigns(category_id);
create index idx_campaigns_state on campaigns(state_uf);
create index idx_campaigns_published on campaigns(published_at desc);
create trigger trg_campaigns_updated before update on campaigns
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------
-- campaign_media (imagens/vídeos adicionais)
-- ---------------------------------------------------------------------
create table campaign_media (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references campaigns(id) on delete cascade,
  storage_path text not null,
  kind text not null default 'image',
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
create index idx_media_campaign on campaign_media(campaign_id);

-- ---------------------------------------------------------------------
-- campaign_updates (atualizações da história)
-- ---------------------------------------------------------------------
create table campaign_updates (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references campaigns(id) on delete cascade,
  author_id uuid references profiles(id),
  title text,
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_updates_campaign on campaign_updates(campaign_id);
create trigger trg_updates_updated before update on campaign_updates
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------
-- campaign_beneficiaries
-- ---------------------------------------------------------------------
create table campaign_beneficiaries (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references campaigns(id) on delete cascade,
  kind beneficiary_kind not null default 'self',
  full_name text,
  relationship text,                  -- vínculo com o organizador
  cpf_digits char(11),                -- privado
  created_at timestamptz not null default now()
);
create index idx_beneficiaries_campaign on campaign_beneficiaries(campaign_id);

-- ---------------------------------------------------------------------
-- campaign_reports (denúncias)
-- ---------------------------------------------------------------------
create table campaign_reports (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references campaigns(id) on delete cascade,
  reporter_id uuid references profiles(id),
  reporter_email citext,
  reason text not null,
  details text,
  status report_status not null default 'open',
  handled_by uuid references profiles(id),
  handled_at timestamptz,
  created_at timestamptz not null default now()
);
create index idx_reports_campaign on campaign_reports(campaign_id);
create index idx_reports_status on campaign_reports(status);

-- ---------------------------------------------------------------------
-- campaign_status_history (auditoria de mudança de status)
-- ---------------------------------------------------------------------
create table campaign_status_history (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references campaigns(id) on delete cascade,
  from_status campaign_status,
  to_status campaign_status not null,
  changed_by uuid references profiles(id),
  reason text,
  created_at timestamptz not null default now()
);
create index idx_status_hist_campaign on campaign_status_history(campaign_id);
