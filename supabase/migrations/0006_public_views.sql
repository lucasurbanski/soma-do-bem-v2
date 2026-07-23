-- =====================================================================
-- 0006_public_views.sql — Views públicas seguras.
-- Expõem SOMENTE campos não-sensíveis de campanhas publicadas + nome
-- público do organizador (display_name/full_name). Nunca CPF/e-mail/telefone.
-- =====================================================================

create or replace view public_campaigns
with (security_invoker = off) as
select
  c.id,
  c.slug,
  c.title,
  c.story,
  c.cover_image_path,
  c.goal_amount_cents,
  c.raised_amount_cents,
  c.donors_count,
  c.city,
  c.state_uf,
  c.status,
  c.published_at,
  c.created_at,
  cat.name  as category_name,
  cat.slug  as category_slug,
  coalesce(p.display_name, p.full_name) as organizer_name
from campaigns c
left join campaign_categories cat on cat.id = c.category_id
left join profiles p on p.id = c.organizer_id
where c.status in ('active', 'completed', 'closed')
  and c.deleted_at is null;

grant select on public_campaigns to anon, authenticated;

-- Últimas doações públicas de uma campanha (sem e-mail; respeita anonimato).
create or replace view public_recent_donations
with (security_invoker = off) as
select
  d.id,
  d.campaign_id,
  case when d.is_anonymous then 'Anônimo' else coalesce(d.donor_name, 'Apoiador') end as donor_label,
  d.amount_cents,
  d.message,
  d.paid_at
from donations d
where d.status = 'paid';

grant select on public_recent_donations to anon, authenticated;
