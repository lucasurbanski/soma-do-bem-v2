'use server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireUser } from '@/features/auth/session';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { reaisToCents } from '@/lib/money';
import { buildSlug, randomSuffix } from './slug';
import { logger } from '@/lib/logger';

export interface CampaignFormState {
  error?: string;
  ok?: boolean;
}

const schema = z.object({
  title: z.string().min(5, 'O título deve ter ao menos 5 caracteres.').max(120),
  categorySlug: z.string().min(1, 'Escolha uma categoria.'),
  city: z.string().max(80).optional().default(''),
  stateUf: z.string().length(2, 'UF inválida.').optional().or(z.literal('')),
  goal: z.string().min(1, 'Informe a meta.'),
  story: z.string().max(10_000).optional().default(''),
  beneficiaryKind: z.enum(['self', 'third_party']).default('self'),
  beneficiaryName: z.string().max(120).optional().default(''),
  beneficiaryRelationship: z.string().max(120).optional().default(''),
});

async function uniqueSlug(adminSelect: (slug: string) => Promise<boolean>, title: string) {
  for (let i = 0; i < 5; i++) {
    const candidate = buildSlug(title, randomSuffix());
    if (!(await adminSelect(candidate))) return candidate;
  }
  return buildSlug(title, randomSuffix(8));
}

export async function createCampaignDraft(
  _prev: CampaignFormState,
  formData: FormData,
): Promise<CampaignFormState> {
  const user = await requireUser('/criar-vaquinha');

  const parsed = schema.safeParse({
    title: formData.get('title'),
    categorySlug: formData.get('categorySlug'),
    city: formData.get('city') ?? '',
    stateUf: formData.get('stateUf') ?? '',
    goal: formData.get('goal'),
    story: formData.get('story') ?? '',
    beneficiaryKind: formData.get('beneficiaryKind') ?? 'self',
    beneficiaryName: formData.get('beneficiaryName') ?? '',
    beneficiaryRelationship: formData.get('beneficiaryRelationship') ?? '',
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos.' };
  }

  let goalCents: number;
  try {
    goalCents = reaisToCents(parsed.data.goal);
  } catch {
    return { error: 'Meta inválida.' };
  }
  if (goalCents < 100) return { error: 'A meta mínima é R$ 1,00.' };

  const admin = createSupabaseAdminClient();

  const { data: category } = await admin
    .from('campaign_categories')
    .select('id')
    .eq('slug', parsed.data.categorySlug)
    .maybeSingle();

  const slug = await uniqueSlug(async (s) => {
    const { data } = await admin.from('campaigns').select('id').eq('slug', s).maybeSingle();
    return !!data;
  }, parsed.data.title);

  const { data: campaign, error } = await admin
    .from('campaigns')
    .insert({
      slug,
      organizer_id: user.id,
      category_id: category?.id ?? null,
      title: parsed.data.title,
      story: parsed.data.story || null,
      goal_amount_cents: goalCents,
      city: parsed.data.city || null,
      state_uf: parsed.data.stateUf ? parsed.data.stateUf.toUpperCase() : null,
      status: 'draft',
    })
    .select('id')
    .single();

  if (error || !campaign) {
    logger.error('campaign_create_failed', { userId: user.id });
    return { error: 'Não foi possível criar a vaquinha. Tente novamente.' };
  }

  // grava beneficiário
  await admin.from('campaign_beneficiaries').insert({
    campaign_id: campaign.id,
    kind: parsed.data.beneficiaryKind,
    full_name: parsed.data.beneficiaryName || null,
    relationship: parsed.data.beneficiaryRelationship || null,
  });

  // histórico de status + garante papel de organizador
  await admin.from('campaign_status_history').insert({
    campaign_id: campaign.id,
    from_status: null,
    to_status: 'draft',
    changed_by: user.id,
  });
  await admin.from('user_roles').upsert({ user_id: user.id, role: 'organizer' });
  await admin.from('audit_logs').insert({
    actor_id: user.id,
    action: 'campaign.draft_created',
    entity_type: 'campaign',
    entity_id: campaign.id,
  });

  redirect(`/painel/vaquinhas/${campaign.id}`);
}

/** Envia rascunho para análise (draft -> pending_review). Server-side + auditoria. */
export async function submitForReview(campaignId: string): Promise<void> {
  const user = await requireUser('/painel');
  const admin = createSupabaseAdminClient();

  const { data: campaign } = await admin
    .from('campaigns')
    .select('id, organizer_id, status, title, story, goal_amount_cents, category_id')
    .eq('id', campaignId)
    .maybeSingle();

  if (!campaign || campaign.organizer_id !== user.id) {
    throw new Error('Vaquinha não encontrada.');
  }
  if (!['draft', 'rejected'].includes(campaign.status)) {
    throw new Error('Esta vaquinha não pode ser enviada para análise no status atual.');
  }
  if (!campaign.story || !campaign.category_id || campaign.goal_amount_cents < 100) {
    throw new Error('Complete título, categoria, meta e história antes de enviar.');
  }

  await admin.from('campaigns').update({ status: 'pending_review' }).eq('id', campaignId);
  await admin.from('campaign_status_history').insert({
    campaign_id: campaignId,
    from_status: campaign.status,
    to_status: 'pending_review',
    changed_by: user.id,
  });
  await admin.from('audit_logs').insert({
    actor_id: user.id,
    action: 'campaign.submitted',
    entity_type: 'campaign',
    entity_id: campaignId,
  });

  revalidatePath(`/painel/vaquinhas/${campaignId}`);
  revalidatePath('/painel/vaquinhas');
}
