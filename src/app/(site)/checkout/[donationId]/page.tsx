import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { formatBRL } from '@/lib/money';
import { simulateMockPayment } from '@/features/donations/actions';

export const metadata: Metadata = { title: 'Status da contribuição' };
export const dynamic = 'force-dynamic';

type Params = Promise<{ donationId: string }>;

export default async function CheckoutStatusPage({ params }: { params: Params }) {
  const { donationId } = await params;

  // Leitura server-side (admin) apenas dos campos necessários para o recibo.
  const admin = createSupabaseAdminClient();
  const { data: donation } = await admin
    .from('donations')
    .select('id, amount_cents, status, is_anonymous, donor_name, campaign_id, paid_at')
    .eq('id', donationId)
    .maybeSingle();
  if (!donation) notFound();

  const { data: charge } = await admin
    .from('payment_charges')
    .select('brcode, status')
    .eq('donation_id', donationId)
    .maybeSingle();

  const { data: campaign } = await admin
    .from('campaigns')
    .select('slug, title')
    .eq('id', donation.campaign_id)
    .single();

  const isPaid = donation.status === 'paid';
  const isDev = process.env.NODE_ENV !== 'production';
  const simulate = simulateMockPayment.bind(null, donationId);

  return (
    <div className="mx-auto max-w-lg px-4 py-12">
      {isPaid ? (
        <div className="card p-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-2xl">
            ✅
          </div>
          <h1 className="text-2xl font-bold text-ink">Contribuição confirmada!</h1>
          <p className="mt-2 text-ink-muted">
            Obrigado por apoiar <strong>{campaign?.title}</strong>.
          </p>
          <div className="mt-6 rounded-lg bg-surface-warm p-4 text-left text-sm">
            <Row label="Recibo" value={`#${donation.id.slice(0, 8).toUpperCase()}`} />
            <Row label="Valor" value={formatBRL(Number(donation.amount_cents))} />
            <Row label="Status" value="Pago" />
          </div>
          <Link href={`/causes/${campaign?.slug}`} className="btn-primary mt-6">
            Ver a vaquinha
          </Link>
        </div>
      ) : (
        <div className="card p-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-2xl">
            ⏳
          </div>
          <h1 className="text-2xl font-bold text-ink">Aguardando pagamento</h1>
          <p className="mt-2 text-ink-muted">
            Sua cobrança Pix de <strong>{formatBRL(Number(donation.amount_cents))}</strong> foi
            gerada. Assim que o pagamento for confirmado pelo provedor, você verá a confirmação aqui.
          </p>

          {charge?.brcode && (
            <div className="mt-6 rounded-lg border border-dashed border-surface-line bg-surface-warm p-4">
              <p className="mb-1 text-xs uppercase tracking-wide text-ink-soft">Pix copia e cola</p>
              <code className="block break-all text-xs text-ink-muted">{charge.brcode}</code>
            </div>
          )}

          <p className="mt-4 text-xs text-ink-soft">
            A confirmação só ocorre após o processamento do webhook do provedor no servidor. O
            frontend nunca marca uma doação como paga.
          </p>

          {isDev && (
            <form action={simulate} className="mt-6">
              <button type="submit" className="btn-outline w-full">
                🧪 Simular confirmação (apenas dev)
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between py-1">
      <span className="text-ink-soft">{label}</span>
      <span className="font-medium text-ink">{value}</span>
    </div>
  );
}
