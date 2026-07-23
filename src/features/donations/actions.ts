'use server';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { z } from 'zod';
import { getServerEnv } from '@/env';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { getPaymentProvider } from '@/features/payments';
import { signMockPayload, type MockWebhookPayload } from '@/features/payments/mock-provider';
import { clientKey, rateLimit } from '@/lib/rate-limit';
import { reaisToCents } from '@/lib/money';
import { logger } from '@/lib/logger';

export interface DonationState {
  error?: string;
}

const schema = z.object({
  causeId: z.string().uuid('Vaquinha inválida.'),
  amount: z.string().min(1, 'Informe o valor.'),
  name: z.string().min(2, 'Informe seu nome.').max(120),
  email: z.string().email('E-mail inválido.'),
  message: z.string().max(280).optional().default(''),
  anonymous: z.string().optional(),
  consent: z.literal('on', { errorMap: () => ({ message: 'É preciso aceitar os termos.' }) }),
});

export async function createMockDonation(
  _prev: DonationState,
  formData: FormData,
): Promise<DonationState> {
  const h = await headers();
  if (!rateLimit(clientKey(h, 'donate'), 10, 60_000).ok) {
    return { error: 'Muitas tentativas. Aguarde um instante.' };
  }

  const parsed = schema.safeParse({
    causeId: formData.get('causeId'),
    amount: formData.get('amount'),
    name: formData.get('name'),
    email: formData.get('email'),
    message: formData.get('message') ?? '',
    anonymous: formData.get('anonymous') ?? undefined,
    consent: formData.get('consent'),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos.' };
  }

  // VALOR calculado/validado no SERVIDOR (o cliente só sugere).
  let amountCents: number;
  try {
    amountCents = reaisToCents(parsed.data.amount);
  } catch {
    return { error: 'Valor inválido.' };
  }

  const admin = createSupabaseAdminClient();

  const { data: campaign } = await admin
    .from('campaigns')
    .select('id, status, title')
    .eq('id', parsed.data.causeId)
    .maybeSingle();
  if (!campaign || campaign.status !== 'active') {
    return { error: 'Esta vaquinha não está disponível para contribuições.' };
  }

  const { data: fee } = await admin
    .from('platform_fees')
    .select('min_contribution_cents')
    .eq('is_active', true)
    .single();
  if (amountCents < Number(fee?.min_contribution_cents ?? 500)) {
    return { error: `O valor mínimo de contribuição é R$ ${((Number(fee?.min_contribution_cents ?? 500)) / 100).toFixed(2)}.` };
  }

  const isAnon = parsed.data.anonymous === 'on';
  const termsVersion = 'terms_of_use';

  // 1) doação (status created)
  const { data: donation, error: donErr } = await admin
    .from('donations')
    .insert({
      campaign_id: campaign.id,
      donor_name: parsed.data.name,
      donor_email: parsed.data.email,
      is_anonymous: isAnon,
      message: parsed.data.message || null,
      amount_cents: amountCents,
      status: 'created',
      provider: 'mock',
      consent_terms: true,
      terms_version: termsVersion,
    })
    .select('id')
    .single();
  if (donErr || !donation) {
    logger.error('donation_create_failed', { campaignId: campaign.id });
    return { error: 'Não foi possível iniciar a contribuição.' };
  }

  // 2) cobrança no provedor (mock), correlationId = id da doação (idempotente)
  const provider = getPaymentProvider();
  const charge = await provider.createCharge({
    correlationId: donation.id,
    amountCents,
    comment: `Contribuição — ${campaign.title}`.slice(0, 80),
    customer: { name: parsed.data.name, email: parsed.data.email },
    expiresInSeconds: 3600,
  });

  // 3) persiste a cobrança
  await admin.from('payment_charges').insert({
    donation_id: donation.id,
    provider: 'mock',
    correlation_id: donation.id,
    external_charge_id: charge.externalChargeId,
    status: 'pending',
    amount_cents: amountCents,
    brcode: charge.brCode ?? null,
    qr_code_image_url: charge.qrCodeImageUrl ?? null,
    expires_at: charge.expiresAt ?? null,
  });

  await admin.from('donations').update({ status: 'pending' }).eq('id', donation.id);
  await admin.from('audit_logs').insert({
    action: 'donation.mock_charge_created',
    entity_type: 'donation',
    entity_id: donation.id,
    correlation_id: donation.id,
  });

  redirect(`/checkout/${donation.id}`);
}

/**
 * SIMULA a confirmação do pagamento (APENAS em desenvolvimento).
 * Constrói um webhook mock ASSINADO e o envia à rota real /api/webhooks/mock,
 * exercitando o MESMO pipeline idempotente que um provedor real usaria.
 */
export async function simulateMockPayment(donationId: string): Promise<void> {
  const env = getServerEnv();
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Simulação indisponível em produção.');
  }

  const admin = createSupabaseAdminClient();
  const { data: charge } = await admin
    .from('payment_charges')
    .select('correlation_id, external_charge_id, amount_cents')
    .eq('donation_id', donationId)
    .maybeSingle();
  if (!charge) throw new Error('Cobrança não encontrada.');

  const payload: MockWebhookPayload = {
    id: `mockev_${donationId}`,
    event: 'mock.charge.paid',
    charge: {
      correlationId: charge.correlation_id,
      externalChargeId: charge.external_charge_id ?? `mock_${charge.correlation_id}`,
      status: 'COMPLETED',
      value: Number(charge.amount_cents),
    },
    occurredAt: new Date().toISOString(),
  };
  const rawBody = JSON.stringify(payload);
  const signature = signMockPayload(rawBody, env.MOCK_WEBHOOK_SECRET);

  const res = await fetch(`${env.APP_BASE_URL}/api/webhooks/mock`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-mock-signature': signature },
    body: rawBody,
  });
  if (!res.ok) {
    throw new Error(`Falha ao simular pagamento (HTTP ${res.status}).`);
  }

  redirect(`/checkout/${donationId}?confirmed=1`);
}
