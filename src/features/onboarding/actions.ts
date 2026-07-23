'use server';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { requireUser } from '@/features/auth/session';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { isValidCpf, onlyDigits, toE164BR } from '@/lib/br';

export interface OnboardingState {
  error?: string;
}

const schema = z.object({
  legalName: z.string().min(2, 'Informe seu nome completo.').max(120),
  cpf: z.string().refine((v) => isValidCpf(v), 'CPF inválido.'),
  birthDate: z.string().refine((v) => !Number.isNaN(Date.parse(v)), 'Data de nascimento inválida.'),
  phone: z.string().refine((v) => toE164BR(v) !== null, 'Telefone inválido.'),
  postalCode: z.string().max(9).optional().default(''),
  street: z.string().max(160).optional().default(''),
  number: z.string().max(20).optional().default(''),
  district: z.string().max(80).optional().default(''),
  city: z.string().max(80).optional().default(''),
  stateUf: z.string().max(2).optional().default(''),
  ownership: z.literal('on', { errorMap: () => ({ message: 'Confirme a declaração de titularidade.' }) }),
});

export async function saveOnboarding(
  _prev: OnboardingState,
  formData: FormData,
): Promise<OnboardingState> {
  const user = await requireUser('/onboarding');

  const parsed = schema.safeParse({
    legalName: formData.get('legalName'),
    cpf: formData.get('cpf'),
    birthDate: formData.get('birthDate'),
    phone: formData.get('phone'),
    postalCode: formData.get('postalCode') ?? '',
    street: formData.get('street') ?? '',
    number: formData.get('number') ?? '',
    district: formData.get('district') ?? '',
    city: formData.get('city') ?? '',
    stateUf: formData.get('stateUf') ?? '',
    ownership: formData.get('ownership'),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos.' };
  }

  const admin = createSupabaseAdminClient();
  const d = parsed.data;

  // Endereço (privado)
  const { data: address } = await admin
    .from('addresses')
    .insert({
      user_id: user.id,
      postal_code: onlyDigits(d.postalCode) || null,
      street: d.street || null,
      number: d.number || null,
      district: d.district || null,
      city: d.city || null,
      state_uf: d.stateUf ? d.stateUf.toUpperCase() : null,
    })
    .select('id')
    .single();

  // Perfil de organizador (CPF armazenado só em dígitos, tabela privada por RLS)
  await admin.from('organizer_profiles').upsert({
    user_id: user.id,
    legal_name: d.legalName,
    cpf_digits: onlyDigits(d.cpf),
    birth_date: d.birthDate,
    phone_e164: toE164BR(d.phone),
    address_id: address?.id ?? null,
    beneficiary_declaration: 'self',
    onboarding_completed_at: new Date().toISOString(),
  });

  // Prepara KYC (status pending) sem exigir dados bancários nesta fase.
  await admin.from('organizer_kyc').upsert({ user_id: user.id, status: 'pending' });
  await admin.from('profiles').update({ onboarding_status: 'pending' }).eq('id', user.id);
  await admin.from('user_roles').upsert({ user_id: user.id, role: 'organizer' });
  await admin.from('audit_logs').insert({
    actor_id: user.id,
    action: 'organizer.onboarding_completed',
    entity_type: 'profile',
    entity_id: user.id,
  });

  redirect('/painel');
}
