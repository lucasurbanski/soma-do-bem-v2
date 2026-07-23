import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ProgressBar } from '@/components/ProgressBar';
import { formatBRL } from '@/lib/money';
import {
  getPublicCampaignBySlug,
  getRecentDonations,
} from '@/features/campaigns/queries';

export const dynamic = 'force-dynamic';

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const campaign = await getPublicCampaignBySlug(slug);
  return { title: campaign?.title ?? 'Vaquinha não encontrada' };
}

export default async function CampaignPage({ params }: { params: Params }) {
  const { slug } = await params;
  const campaign = await getPublicCampaignBySlug(slug);
  if (!campaign) notFound();

  const donations = await getRecentDonations(campaign.id);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <p className="text-center text-sm text-ink-soft">Apoie aqui a vaquinha online</p>
      <h1 className="mx-auto mt-1 max-w-3xl text-center text-3xl font-bold text-ink">
        {campaign.title}
      </h1>

      <div className="mt-8 grid gap-6 md:grid-cols-[1.4fr_1fr]">
        {/* Capa */}
        <div className="relative aspect-[16/10] overflow-hidden rounded-xl bg-brand-50">
          {campaign.coverImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={campaign.coverImageUrl}
              alt={`Capa da vaquinha: ${campaign.title}`}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-6xl text-brand-300">
              💗
            </div>
          )}
        </div>

        {/* Card de progresso */}
        <aside className="card flex flex-col gap-4 p-6">
          <div>
            <p className="text-sm text-ink-soft">Arrecadado</p>
            <p className="text-3xl font-extrabold text-ink">
              {formatBRL(campaign.raisedAmountCents)}
            </p>
            <p className="text-sm text-ink-soft">De {formatBRL(campaign.goalAmountCents)}</p>
          </div>
          <ProgressBar
            raisedCents={campaign.raisedAmountCents}
            goalCents={campaign.goalAmountCents}
            showValues={false}
          />
          <Link href={`/checkout?causeId=${campaign.id}`} className="btn-primary py-3 text-base">
            Quero contribuir
          </Link>
          <div className="rounded-lg bg-amber-50 px-4 py-3 text-xs text-ink-muted">
            💛 Esta vaquinha ganhou a primeira contribuição no valor de R$ 10 do Apoie aqui ao ser
            criada.
          </div>
        </aside>
      </div>

      {/* Organizador */}
      <div className="mt-8 text-center">
        <p className="text-sm text-ink-soft">Esta vaquinha foi criada por</p>
        <p className="font-semibold text-ink">{campaign.organizerName ?? 'Organizador'}</p>
      </div>

      {/* História */}
      <section className="card mt-8 p-6">
        <h2 className="mb-3 text-xl font-bold text-ink">Conheça a história</h2>
        {campaign.story ? (
          <div className="prose-sm whitespace-pre-wrap text-ink-muted">{campaign.story}</div>
        ) : (
          <p className="text-ink-soft">O organizador ainda não adicionou a história.</p>
        )}
      </section>

      {/* Últimas doações */}
      <section className="card mt-6 p-6">
        <h2 className="mb-4 text-xl font-bold text-ink">Últimas doações recebidas</h2>
        {donations.length > 0 ? (
          <ul className="grid gap-3 sm:grid-cols-2">
            {donations.map((d) => (
              <li key={d.id} className="flex items-center justify-between rounded-lg border border-surface-line px-4 py-3">
                <div>
                  <p className="font-medium text-ink">{d.donorLabel}</p>
                  {d.message && <p className="text-xs text-ink-soft">{d.message}</p>}
                </div>
                <span className="font-semibold text-brand-600">{formatBRL(d.amountCents)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-ink-soft">Ainda não há doações. Seja o primeiro a contribuir 💗</p>
        )}
      </section>

      <div className="mt-6 text-center">
        <Link href={`/denunciar?causeId=${campaign.id}`} className="text-sm text-ink-soft hover:text-brand-600">
          ⓘ Denunciar esta vaquinha
        </Link>
      </div>
    </div>
  );
}
