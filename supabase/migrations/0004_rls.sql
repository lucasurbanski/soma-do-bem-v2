-- =====================================================================
-- 0004_rls.sql — Row Level Security.
-- Princípio: NEGAR por padrão. Nenhuma policy permite que um usuário
-- comum altere saldo, pagamento, taxa ou status financeiro diretamente.
-- Escritas financeiras/privilegiadas só ocorrem via service role (server).
-- =====================================================================

-- ---------------------------------------------------------------------
-- Helpers de papel (SECURITY DEFINER: ignoram RLS para checar papéis)
-- ---------------------------------------------------------------------
create or replace function auth_has_role(p_role app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from user_roles
    where user_id = auth.uid() and role = p_role
  );
$$;

create or replace function auth_is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from user_roles
    where user_id = auth.uid() and role = 'admin'
  );
$$;

create or replace function auth_is_staff()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from user_roles
    where user_id = auth.uid() and role in ('admin','moderator','support','financial_operator')
  );
$$;

-- ---------------------------------------------------------------------
-- Trigger: cria profile + papel 'donor' ao registrar usuário (auth.users)
-- ---------------------------------------------------------------------
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', null))
  on conflict (id) do nothing;
  insert into public.user_roles (user_id, role)
  values (new.id, 'donor')
  on conflict do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ---------------------------------------------------------------------
-- Habilita RLS em TODAS as tabelas
-- ---------------------------------------------------------------------
alter table profiles                enable row level security;
alter table user_roles              enable row level security;
alter table addresses               enable row level security;
alter table organizer_profiles      enable row level security;
alter table organizer_kyc           enable row level security;
alter table campaign_categories     enable row level security;
alter table campaigns               enable row level security;
alter table campaign_media          enable row level security;
alter table campaign_updates        enable row level security;
alter table campaign_beneficiaries  enable row level security;
alter table campaign_reports        enable row level security;
alter table campaign_status_history enable row level security;
alter table donations               enable row level security;
alter table payment_charges         enable row level security;
alter table payment_webhook_events  enable row level security;
alter table payment_events          enable row level security;
alter table payment_refunds         enable row level security;
alter table ledger_entries          enable row level security;
alter table ledger_accounts         enable row level security;
alter table withdrawal_requests     enable row level security;
alter table payouts                 enable row level security;
alter table platform_fees           enable row level security;
alter table notifications           enable row level security;
alter table terms_acceptances       enable row level security;
alter table audit_logs              enable row level security;
alter table feature_flags           enable row level security;
alter table platform_settings       enable row level security;

-- ---------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------
create policy profiles_select_own_or_staff on profiles for select
  using (id = auth.uid() or auth_is_staff());
create policy profiles_update_own on profiles for update
  using (id = auth.uid())
  with check (id = auth.uid() and is_suspended = false);
-- inserção é feita pela trigger (service role); sem policy de insert p/ cliente.

-- ---------------------------------------------------------------------
-- user_roles — usuário lê os próprios papéis; escrita só service role
-- ---------------------------------------------------------------------
create policy roles_select_own_or_staff on user_roles for select
  using (user_id = auth.uid() or auth_is_staff());

-- ---------------------------------------------------------------------
-- addresses / organizer_profiles / organizer_kyc — dono gerencia os seus
-- ---------------------------------------------------------------------
create policy addr_owner_all on addresses for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy addr_staff_read on addresses for select using (auth_is_staff());

create policy org_owner_all on organizer_profiles for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy org_staff_read on organizer_profiles for select using (auth_is_staff());

create policy kyc_owner_read on organizer_kyc for select
  using (user_id = auth.uid() or auth_is_staff());
create policy kyc_owner_upsert on organizer_kyc for insert
  with check (user_id = auth.uid());
-- update de status de KYC (approve/reject) é feito por staff via service role.

-- ---------------------------------------------------------------------
-- campaign_categories — leitura pública das ativas
-- ---------------------------------------------------------------------
create policy cat_public_read on campaign_categories for select
  using (is_active or auth_is_staff());

-- ---------------------------------------------------------------------
-- campaigns
--  - público lê campanhas publicadas (active/completed/closed) e não deletadas
--  - organizador lê/gerencia as suas (qualquer status)
--  - staff lê todas
--  - transições privilegiadas de status (approve/reject/suspend) = service role
-- ---------------------------------------------------------------------
create policy camp_public_read on campaigns for select
  using (
    (status in ('active','completed','closed') and deleted_at is null)
    or organizer_id = auth.uid()
    or auth_is_staff()
  );
create policy camp_org_insert on campaigns for insert
  with check (organizer_id = auth.uid());
create policy camp_org_update on campaigns for update
  using (organizer_id = auth.uid())
  with check (
    organizer_id = auth.uid()
    -- organizador só mantém a campanha em estados que ele controla;
    -- não pode se auto-aprovar/suspender.
    and status in ('draft','pending_review','paused','active')
  );

-- ---------------------------------------------------------------------
-- campaign_media / updates / beneficiaries — visíveis se a campanha é
-- pública; gerenciados pelo organizador dono.
-- ---------------------------------------------------------------------
create policy media_read on campaign_media for select
  using (exists (select 1 from campaigns c where c.id = campaign_id
    and (c.status in ('active','completed','closed') or c.organizer_id = auth.uid() or auth_is_staff())));
create policy media_org_write on campaign_media for all
  using (exists (select 1 from campaigns c where c.id = campaign_id and c.organizer_id = auth.uid()))
  with check (exists (select 1 from campaigns c where c.id = campaign_id and c.organizer_id = auth.uid()));

create policy updates_read on campaign_updates for select
  using (exists (select 1 from campaigns c where c.id = campaign_id
    and (c.status in ('active','completed','closed') or c.organizer_id = auth.uid() or auth_is_staff())));
create policy updates_org_write on campaign_updates for all
  using (exists (select 1 from campaigns c where c.id = campaign_id and c.organizer_id = auth.uid()))
  with check (exists (select 1 from campaigns c where c.id = campaign_id and c.organizer_id = auth.uid()));

-- beneficiários contêm CPF: NÃO são de leitura pública. Só dono/staff.
create policy benef_owner_read on campaign_beneficiaries for select
  using (exists (select 1 from campaigns c where c.id = campaign_id and (c.organizer_id = auth.uid() or auth_is_staff())));
create policy benef_owner_write on campaign_beneficiaries for all
  using (exists (select 1 from campaigns c where c.id = campaign_id and c.organizer_id = auth.uid()))
  with check (exists (select 1 from campaigns c where c.id = campaign_id and c.organizer_id = auth.uid()));

-- ---------------------------------------------------------------------
-- campaign_reports — qualquer um pode denunciar (insert); leitura restrita
-- ---------------------------------------------------------------------
create policy reports_insert_any on campaign_reports for insert with check (true);
create policy reports_read_staff on campaign_reports for select using (auth_is_staff());

-- ---------------------------------------------------------------------
-- campaign_status_history — leitura: dono da campanha ou staff
-- ---------------------------------------------------------------------
create policy status_hist_read on campaign_status_history for select
  using (exists (select 1 from campaigns c where c.id = campaign_id and (c.organizer_id = auth.uid() or auth_is_staff())));

-- ---------------------------------------------------------------------
-- donations — leitura: doador dono, organizador da campanha, ou staff.
-- SEM insert/update/delete p/ cliente (server action usa service role).
-- ---------------------------------------------------------------------
create policy donations_read on donations for select
  using (
    donor_id = auth.uid()
    or auth_is_staff()
    or exists (select 1 from campaigns c where c.id = campaign_id and c.organizer_id = auth.uid())
  );

-- ---------------------------------------------------------------------
-- TABELAS FINANCEIRAS SENSÍVEIS — sem NENHUMA policy p/ cliente.
-- (RLS ligado + zero policy = acesso negado ao anon/authenticated;
--  apenas service role, que ignora RLS, escreve/lê.)
--   payment_charges, payment_webhook_events, payment_events,
--   payment_refunds, ledger_entries, payouts.
-- Organizador consulta seu saldo via RPC SECURITY DEFINER (abaixo).
-- ---------------------------------------------------------------------

-- ledger_accounts (catálogo) — leitura liberada (não é dado sensível)
create policy ledger_accounts_read on ledger_accounts for select using (true);

-- ---------------------------------------------------------------------
-- withdrawal_requests — organizador lê as suas (bank_payload é omitido
-- nas queries da aplicação); escrita via service role.
-- ---------------------------------------------------------------------
create policy withdrawals_read_own on withdrawal_requests for select
  using (organizer_id = auth.uid() or auth_is_staff());

-- ---------------------------------------------------------------------
-- platform_fees — leitura da versão ativa (para exibir taxas); sem escrita
-- ---------------------------------------------------------------------
create policy fees_read_active on platform_fees for select
  using (is_active or auth_is_staff());

-- ---------------------------------------------------------------------
-- notifications — dono lê/atualiza (marcar como lida)
-- ---------------------------------------------------------------------
create policy notif_read_own on notifications for select using (user_id = auth.uid());
create policy notif_update_own on notifications for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------------------------------------------------------------------
-- terms_acceptances — dono lê os seus; insert via server
-- ---------------------------------------------------------------------
create policy terms_read_own on terms_acceptances for select
  using (user_id = auth.uid() or auth_is_staff());

-- ---------------------------------------------------------------------
-- audit_logs — só staff lê; escrita via service role
-- ---------------------------------------------------------------------
create policy audit_read_staff on audit_logs for select using (auth_is_staff());

-- ---------------------------------------------------------------------
-- feature_flags / platform_settings — leitura pública (não secretos)
-- ---------------------------------------------------------------------
create policy flags_read on feature_flags for select using (true);
create policy settings_read on platform_settings for select using (true);

-- ---------------------------------------------------------------------
-- RPC oficial de saldo (SECURITY DEFINER): só dono da campanha ou staff.
-- ---------------------------------------------------------------------
create or replace function my_campaign_balance(p_campaign_id uuid)
returns table (
  raised_gross_cents bigint, platform_fee_cents bigint, gateway_fee_cents bigint,
  net_cents bigint, pending_cents bigint, available_cents bigint,
  withdrawn_cents bigint, refunded_cents bigint
) language plpgsql stable security definer set search_path = public as $$
begin
  if not exists (
    select 1 from campaigns c
    where c.id = p_campaign_id and (c.organizer_id = auth.uid() or auth_is_staff())
  ) then
    raise exception 'not authorized';
  end if;
  return query select * from campaign_ledger_balance(p_campaign_id);
end $$;

revoke all on function my_campaign_balance(uuid) from public;
grant execute on function my_campaign_balance(uuid) to authenticated;
