'use server';
import { headers } from 'next/headers';
import { z } from 'zod';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { clientKey, rateLimit } from '@/lib/rate-limit';

export interface ReportState {
  error?: string;
  ok?: boolean;
}

const schema = z.object({
  causeId: z.string().uuid('Vaquinha inválida.'),
  reason: z.string().min(3, 'Descreva o motivo.').max(120),
  details: z.string().max(1000).optional().default(''),
  email: z.string().email().optional().or(z.literal('')),
});

export async function submitReport(_prev: ReportState, formData: FormData): Promise<ReportState> {
  const h = await headers();
  if (!rateLimit(clientKey(h, 'report'), 5, 60_000).ok) {
    return { error: 'Muitas tentativas. Aguarde um instante.' };
  }

  const parsed = schema.safeParse({
    causeId: formData.get('causeId'),
    reason: formData.get('reason'),
    details: formData.get('details') ?? '',
    email: formData.get('email') ?? '',
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos.' };
  }

  const admin = createSupabaseAdminClient();
  const { error } = await admin.from('campaign_reports').insert({
    campaign_id: parsed.data.causeId,
    reason: parsed.data.reason,
    details: parsed.data.details || null,
    reporter_email: parsed.data.email || null,
    status: 'open',
  });
  if (error) return { error: 'Não foi possível registrar a denúncia.' };

  return { ok: true };
}
