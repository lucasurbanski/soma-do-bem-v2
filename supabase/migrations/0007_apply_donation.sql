-- =====================================================================
-- 0007_apply_donation.sql — Aplicação transacional de doação paga.
-- Toda a operação roda em UMA transação (a função). A unicidade de
-- idempotency_key nos lançamentos garante que reprocessar não duplica:
-- o segundo insert gera unique_violation (23505) e desfaz tudo.
-- =====================================================================

create or replace function apply_donation_paid(
  p_charge_id uuid,
  p_webhook_event_id uuid,
  p_paid_at timestamptz,
  p_gross bigint,
  p_gateway_fee bigint,
  p_platform_fee bigint,
  p_net bigint,
  p_release_immediately boolean
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_donation_id uuid;
  v_campaign_id uuid;
  v_credit_account ledger_account;
  v_key_prefix text;
begin
  select donation_id into v_donation_id from payment_charges where id = p_charge_id;
  if v_donation_id is null then
    raise exception 'charge % sem doação', p_charge_id;
  end if;
  select campaign_id into v_campaign_id from donations where id = v_donation_id;

  v_credit_account := case when p_release_immediately then 'campaign_available' else 'campaign_pending' end;
  v_key_prefix := v_donation_id::text || ':donation_paid:';

  -- 4 lançamentos do ledger (idempotency_key único). Conflito => 23505 => rollback.
  insert into ledger_entries
    (group_id, campaign_id, account, entry_type, direction, amount_cents,
     donation_id, charge_id, webhook_event_id, idempotency_key, memo)
  values
    (p_charge_id, v_campaign_id, 'gateway_clearing', 'donation_gross', 1, p_gross,
     v_donation_id, p_charge_id, p_webhook_event_id, v_key_prefix || 'donation_gross', 'Doação recebida (bruto)'),
    (p_charge_id, v_campaign_id, 'gateway_fee_expense', 'gateway_fee', 1, p_gateway_fee,
     v_donation_id, p_charge_id, p_webhook_event_id, v_key_prefix || 'gateway_fee', 'Taxa do gateway'),
    (p_charge_id, v_campaign_id, 'platform_revenue', 'platform_fee', 1, p_platform_fee,
     v_donation_id, p_charge_id, p_webhook_event_id, v_key_prefix || 'platform_fee', 'Taxa da plataforma'),
    (p_charge_id, v_campaign_id, v_credit_account, 'campaign_credit', 1, p_net,
     v_donation_id, p_charge_id, p_webhook_event_id, v_key_prefix || 'campaign_credit', 'Valor líquido da vaquinha');

  update payment_charges set status = 'paid', updated_at = now() where id = p_charge_id;
  update donations set status = 'paid', paid_at = p_paid_at, updated_at = now()
    where id = v_donation_id and status <> 'paid';

  -- Atualiza o CACHE da campanha a partir do ledger (fonte oficial).
  update campaigns c set
    raised_amount_cents = (
      select coalesce(sum(amount_cents), 0) from ledger_entries
      where campaign_id = c.id and entry_type = 'donation_gross'
    ),
    donors_count = (
      select count(distinct donation_id) from ledger_entries
      where campaign_id = c.id and entry_type = 'campaign_credit'
    ),
    updated_at = now()
  where c.id = v_campaign_id;
end $$;

revoke all on function apply_donation_paid(uuid, uuid, timestamptz, bigint, bigint, bigint, bigint, boolean) from public, anon, authenticated;
