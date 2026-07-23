'use server';
import { revalidatePath } from 'next/cache';
import { requireStaff } from '@/features/auth/session';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { logger } from '@/lib/logger';

type ModStatus = 'active' | 'rejected' | 'paused' | 'suspended' | 'closed';

async function transition(campaignId: string, to: ModStatus, reason?: string) {
  const staff = await requireStaff();
  const admin = createSupabaseAdminClient();

  const { data: campaign } = await admin
    .from('campaigns')
    .select('id, status')
    .eq('id', campaignId)
    .maybeSingle();
  if (!campaign) throw new Error('Vaquinha não encontrada.');

  const patch: Record<string, unknown> = { status: to };
  if (to === 'active') {
    patch.published_at = new Date().toISOString();
    patch.reviewed_by = staff.id;
    patch.reviewed_at = new Date().toISOString();
    patch.rejection_reason = null;
  }
  if (to === 'rejected') {
    patch.reviewed_by = staff.id;
    patch.reviewed_at = new Date().toISOString();
    patch.rejection_reason = reason ?? 'Não especificado';
  }

  await admin.from('campaigns').update(patch).eq('id', campaignId);
  await admin.from('campaign_status_history').insert({
    campaign_id: campaignId,
    from_status: campaign.status,
    to_status: to,
    changed_by: staff.id,
    reason: reason ?? null,
  });
  await admin.from('audit_logs').insert({
    actor_id: staff.id,
    action: `campaign.${to}`,
    entity_type: 'campaign',
    entity_id: campaignId,
    metadata: reason ? { reason } : null,
  });

  logger.info('moderation_action', { campaignId, userId: staff.id });
  revalidatePath('/admin/moderacao');
  revalidatePath('/admin');
}

export async function approveCampaign(formData: FormData): Promise<void> {
  await transition(String(formData.get('campaignId')), 'active');
}
export async function rejectCampaign(formData: FormData): Promise<void> {
  await transition(String(formData.get('campaignId')), 'rejected', String(formData.get('reason') || ''));
}
export async function pauseCampaign(formData: FormData): Promise<void> {
  await transition(String(formData.get('campaignId')), 'paused');
}
export async function suspendCampaign(formData: FormData): Promise<void> {
  await transition(String(formData.get('campaignId')), 'suspended', String(formData.get('reason') || ''));
}
