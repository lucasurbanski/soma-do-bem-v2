import { formatBRL, progressPercent } from '@/lib/money';

export function ProgressBar({
  raisedCents,
  goalCents,
  showValues = true,
}: {
  raisedCents: number;
  goalCents: number;
  showValues?: boolean;
}) {
  const pct = progressPercent(raisedCents, goalCents);
  return (
    <div>
      <div
        className="h-2 w-full overflow-hidden rounded-full bg-surface-line"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Progresso da meta"
      >
        <div className="h-full rounded-full bg-progress transition-all" style={{ width: `${pct}%` }} />
      </div>
      {showValues && (
        <div className="mt-2 flex items-baseline justify-between text-sm">
          <span className="font-semibold text-ink">{formatBRL(raisedCents)}</span>
          <span className="text-ink-soft">
            <strong className="text-ink">{pct}%</strong> de {formatBRL(goalCents)}
          </span>
        </div>
      )}
    </div>
  );
}
