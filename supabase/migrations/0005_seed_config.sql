-- =====================================================================
-- 0005_seed_config.sql — Configuração inicial (idempotente).
-- Categorias, feature flags, settings e a versão de taxas ATIVA.
-- Valores financeiros são PLACEHOLDERS (ver docs/11-open-decisions.md).
-- =====================================================================

-- Categorias (baseadas no staging real)
insert into campaign_categories (slug, name, sort_order) values
  ('saude',        'Saúde',         10),
  ('educacao',     'Educação',      20),
  ('animais',      'Animais',       30),
  ('meio-ambiente','Meio Ambiente', 40),
  ('esportes',     'Esportes',      50),
  ('cultura',      'Cultura',       60),
  ('tecnologia',   'Tecnologia',    70),
  ('comunidade',   'Comunidade',    80),
  ('emergencia',   'Emergência',    90),
  ('outros',       'Outros',        100)
on conflict (slug) do nothing;

-- Feature flags (todas desativadas nesta fase)
insert into feature_flags (key, enabled, description) values
  ('PAYMENTS_ENABLED', false, 'Habilita pagamentos reais (qualquer provedor)'),
  ('WOOVI_ENABLED', false, 'Habilita o provedor Woovi/OpenPix'),
  ('WOOVI_SPLIT_ENABLED', false, 'Habilita split de pagamento na Woovi (exige habilitação comercial)'),
  ('WOOVI_SUBACCOUNTS_ENABLED', false, 'Habilita subcontas Woovi (exige habilitação comercial)'),
  ('WITHDRAWALS_ENABLED', false, 'Habilita solicitações/pagamentos de saque'),
  ('KYC_ENABLED', false, 'Habilita KYC real de recebedores'),
  ('HEARTS_ENABLED', false, 'FUTURO: corações pagos'),
  ('EMOJIS_ENABLED', false, 'FUTURO: emojis pagos'),
  ('HIGHLIGHT_ENABLED', false, 'FUTURO: destaque pago da vaquinha'),
  ('PLATFORM_SEED_DONATION_ENABLED', false, 'FUTURO: primeira contribuição da plataforma (R$10)')
on conflict (key) do nothing;

-- Settings gerais
insert into platform_settings (key, value, description) values
  ('brand', '{"name":"Apoie Aqui","legal_entity":"Soma do Bem","city":"Joinville","state":"SC"}', 'Identidade da marca'),
  ('terms_version', '"2025-07-01"', 'Versão vigente dos Termos de Uso'),
  ('privacy_version', '"2025-07-01"', 'Versão vigente da Política de Privacidade'),
  ('campaign_max_days', '0', 'Prazo máximo da vaquinha em dias (0 = sem prazo) — PENDENTE'),
  ('auto_publish', 'false', 'Publicação automática sem moderação — PENDENTE (default: moderado)')
on conflict (key) do nothing;

-- Versão de taxas ativa (v1) — PLACEHOLDERS versionados
insert into platform_fees (
  version, platform_fee_bps, gateway_fee_bps, gateway_fee_fixed_cents,
  min_contribution_cents, min_withdrawal_cents, withdrawal_fee_cents,
  chargeback_reserve_bps, release_delay_days, is_active, notes
) values (
  1, 500, 99, 0, 500, 2000, 0, 0, 0, true,
  'Versão inicial (placeholders). Taxas/prazos pendentes de decisão de negócio — docs/11.'
)
on conflict (version) do nothing;
