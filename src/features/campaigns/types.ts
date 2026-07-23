export interface PublicCampaign {
  id: string;
  slug: string;
  title: string;
  story: string | null;
  coverImageUrl: string | null;
  goalAmountCents: number;
  raisedAmountCents: number;
  donorsCount: number;
  city: string | null;
  stateUf: string | null;
  categoryName: string | null;
  categorySlug: string | null;
  organizerName: string | null;
  publishedAt: string | null;
  createdAt: string;
}

export const CAMPAIGN_STATUS_LABELS: Record<string, string> = {
  draft: 'Rascunho',
  pending_review: 'Em análise',
  active: 'Ativa',
  paused: 'Pausada',
  rejected: 'Rejeitada',
  completed: 'Concluída',
  closed: 'Encerrada',
  suspended: 'Suspensa',
};

export const CAMPAIGN_STATUS_BADGE: Record<string, string> = {
  draft: 'bg-surface-warm text-ink-muted',
  pending_review: 'bg-amber-50 text-amber-700',
  active: 'bg-green-50 text-green-700',
  paused: 'bg-surface-warm text-ink-muted',
  rejected: 'bg-red-50 text-red-700',
  completed: 'bg-blue-50 text-blue-700',
  closed: 'bg-blue-50 text-blue-700',
  suspended: 'bg-red-50 text-red-700',
};
