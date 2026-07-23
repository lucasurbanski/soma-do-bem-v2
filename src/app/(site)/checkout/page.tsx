import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { DonationForm } from '@/features/donations/DonationForm';

export const metadata: Metadata = { title: 'Contribuir' };
export const dynamic = 'force-dynamic';

type SP = Promise<{ causeId?: string }>;

export default async function CheckoutPage({ searchParams }: { searchParams: SP }) {
  const { causeId } = await searchParams;
  if (!causeId) notFound();

  const supabase = await createSupabaseServerClient();
  const { data: campaign } = await supabase
    .from('public_campaigns')
    .select('id, title')
    .eq('id', causeId)
    .maybeSingle();
  if (!campaign) notFound();

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <p className="text-sm text-ink-soft">🔒 Aqui sua doação está em segurança</p>
      <h1 className="mt-1 text-2xl font-bold text-ink">Faça sua contribuição</h1>
      <div className="card mt-6 p-6">
        <DonationForm causeId={campaign.id} causeTitle={campaign.title} />
      </div>
    </div>
  );
}
