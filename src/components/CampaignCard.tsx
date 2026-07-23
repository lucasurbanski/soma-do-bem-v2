import Link from 'next/link';
import { ProgressBar } from './ProgressBar';
import type { PublicCampaign } from '@/features/campaigns/types';

export function CampaignCard({ c }: { c: PublicCampaign }) {
  return (
    <Link
      href={`/causes/${c.slug}`}
      className="card group block overflow-hidden transition hover:shadow-lg"
    >
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-brand-50">
        {c.coverImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={c.coverImageUrl}
            alt={`Capa da vaquinha: ${c.title}`}
            className="h-full w-full object-cover transition group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-brand-300">
            <span className="text-4xl">💗</span>
          </div>
        )}
        {c.categoryName && (
          <span className="badge absolute left-3 top-3 bg-white/90 text-ink">{c.categoryName}</span>
        )}
      </div>
      <div className="space-y-3 p-4">
        <h3 className="line-clamp-2 min-h-[2.5rem] font-semibold text-ink">{c.title}</h3>
        <ProgressBar raisedCents={c.raisedAmountCents} goalCents={c.goalAmountCents} />
        {(c.city || c.stateUf) && (
          <p className="text-xs text-ink-soft">
            {[c.city, c.stateUf].filter(Boolean).join(' · ')}
          </p>
        )}
      </div>
    </Link>
  );
}
