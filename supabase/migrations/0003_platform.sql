-- =====================================================================
-- 0003_platform.sql — Notificações, termos, auditoria, flags, settings,
-- função oficial de saldo (a partir do ledger) e helper de slug.
-- =====================================================================

-- ---------------------------------------------------------------------
-- notifications
-- ---------------------------------------------------------------------
create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  type text not null,
  title text not null,
  body text,
  data jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index idx_notifications_user on notifications(user_id, read_at);

-- ---------------------------------------------------------------------
-- terms_acceptances — aceite de termos VERSIONADO
-- ---------------------------------------------------------------------
create table terms_acceptances (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete set null,
  email citext,
  terms_version text not null,
  document_kind text not null default 'terms_of_use',
  accepted_at timestamptz not null default now(),
  ip_hash text,                       -- hash do IP (sem armazenar IP cru)
  user_agent text
);
create index idx_terms_user on terms_acceptances(user_id);

-- ---------------------------------------------------------------------
-- audit_logs — trilha de auditoria de ações sensíveis/admin
-- ---------------------------------------------------------------------
create table audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references profiles(id),
  action text not null,               -- ex: campaign.approve
  entity_type text not null,
  entity_id text,
  metadata jsonb,
  correlation_id text,
  created_at timestamptz not null default now()
);
create index idx_audit_actor on audit_logs(actor_id);
create index idx_audit_entity on audit_logs(entity_type, entity_id);
create index idx_audit_created on audit_logs(created_at desc);

-- ---------------------------------------------------------------------
-- feature_flags — flags globais (fonte da verdade no banco)
-- ---------------------------------------------------------------------
create table feature_flags (
  key text primary key,
  enabled boolean not null default false,
  description text,
  updated_at timestamptz not null default now()
);
create trigger trg_flags_updated before update on feature_flags
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------
-- platform_settings — configurações gerais chave/valor
-- ---------------------------------------------------------------------
create table platform_settings (
  key text primary key,
  value jsonb not null,
  description text,
  updated_at timestamptz not null default now()
);
create trigger trg_settings_updated before update on platform_settings
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------
-- FUNÇÃO OFICIAL DE SALDO (a partir do ledger imutável)
-- Retorna centavos. Nunca use campaigns.raised_amount_cents p/ decisão financeira.
-- ---------------------------------------------------------------------
create or replace function campaign_ledger_balance(p_campaign_id uuid)
returns table (
  raised_gross_cents bigint,
  platform_fee_cents bigint,
  gateway_fee_cents bigint,
  net_cents bigint,
  pending_cents bigint,
  available_cents bigint,
  withdrawn_cents bigint,
  refunded_cents bigint
) language sql stable as $$
  select
    coalesce(sum(amount_cents) filter (where entry_type = 'donation_gross'), 0),
    coalesce(sum(amount_cents) filter (where entry_type = 'platform_fee'), 0),
    coalesce(sum(amount_cents) filter (where entry_type = 'gateway_fee'), 0),
    coalesce(sum(direction * amount_cents) filter (where entry_type = 'campaign_credit'), 0),
    coalesce(sum(direction * amount_cents) filter (where account = 'campaign_pending'), 0),
    coalesce(sum(direction * amount_cents) filter (where account = 'campaign_available'), 0),
    coalesce(sum(direction * amount_cents) filter (where account = 'campaign_withdrawn'), 0),
    coalesce(sum(amount_cents) filter (where entry_type in ('refund','chargeback')), 0)
  from ledger_entries
  where campaign_id = p_campaign_id;
$$;

-- ---------------------------------------------------------------------
-- Helper de slug: normaliza texto -> kebab (sem acento)
-- (a unicidade final é garantida na aplicação com sufixo hexadecimal)
-- ---------------------------------------------------------------------

-- unaccent sem depender da extensão unaccent (fallback simples)
create or replace function unaccent_fallback(p text)
returns text language sql immutable as $$
  select translate(
    p,
    'áàâãäéèêëíìîïóòôõöúùûüçÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇ',
    'aaaaaeeeeiiiiooooouuuucAAAAAEEEEIIIIOOOOOUUUUC'
  );
$$;

create or replace function slugify(p_text text)
returns text language sql immutable as $$
  select trim(both '-' from
    regexp_replace(
      regexp_replace(
        lower(unaccent_fallback(p_text)),
        '[^a-z0-9]+', '-', 'g'
      ),
      '-{2,}', '-', 'g'
    )
  );
$$;
