import type { Metadata } from 'next';
import Link from 'next/link';
import { requireUser } from '@/features/auth/session';
import { getCategories } from '@/features/campaigns/queries';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { CreateCampaignForm } from '@/features/campaigns/CreateCampaignForm';

export const metadata: Metadata = { title: 'Criar vaquinha' };

export default async function CreateCampaignPage() {
  const user = await requireUser('/criar-vaquinha');
  const categories = await getCategories();

  // Verifica onboarding (para orientar, não bloqueia salvar rascunho).
  const supabase = await createSupabaseServerClient();
  const { data: profile } = await supabase
    .from('profiles')
    .select('onboarding_status')
    .eq('id', user.id)
    .maybeSingle();
  const onboardingDone = profile?.onboarding_status === 'approved' || profile?.onboarding_status === 'pending';

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-bold text-ink">Criar sua vaquinha</h1>
      <p className="mt-1 text-ink-soft">
        Preencha as etapas abaixo. Você poderá revisar e enviar para análise antes de publicar.
      </p>

      {!onboardingDone && (
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-ink-muted">
          Para <strong>enviar sua vaquinha para análise</strong> você precisará concluir seus dados
          de organizador.{' '}
          <Link href="/onboarding" className="font-semibold text-brand-600">
            Concluir agora
          </Link>
          . Você já pode salvar um rascunho.
        </div>
      )}

      <div className="mt-8">
        <CreateCampaignForm categories={categories} />
      </div>
    </div>
  );
}
