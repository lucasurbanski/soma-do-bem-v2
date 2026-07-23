import 'server-only';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { publicEnv } from '@/env';
import type { PublicCampaign } from './types';

const BUCKET = 'campaign-media';

export function storagePublicUrl(path: string | null): string | null {
  if (!path) return null;
  return `${publicEnv.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${path}`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapCampaign(row: any): PublicCampaign {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    story: row.story ?? null,
    coverImageUrl: storagePublicUrl(row.cover_image_path ?? null),
    goalAmountCents: Number(row.goal_amount_cents),
    raisedAmountCents: Number(row.raised_amount_cents ?? 0),
    donorsCount: Number(row.donors_count ?? 0),
    city: row.city ?? null,
    stateUf: row.state_uf ?? null,
    categoryName: row.category_name ?? null,
    categorySlug: row.category_slug ?? null,
    organizerName: row.organizer_name ?? null,
    publishedAt: row.published_at ?? null,
    createdAt: row.created_at,
  };
}

export interface Category {
  id: string;
  slug: string;
  name: string;
}

export async function getCategories(): Promise<Category[]> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('campaign_categories')
    .select('id, slug, name')
    .eq('is_active', true)
    .order('sort_order');
  return data ?? [];
}

export interface ListParams {
  q?: string;
  category?: string;
  city?: string;
  sort?: 'created_at' | 'title' | 'goal_amount';
  limit?: number;
}

export async function listPublicCampaigns(params: ListParams = {}): Promise<PublicCampaign[]> {
  const supabase = await createSupabaseServerClient();
  let query = supabase.from('public_campaigns').select('*');

  if (params.q) query = query.ilike('title', `%${params.q}%`);
  if (params.category) query = query.eq('category_slug', params.category);
  if (params.city) query = query.ilike('city', `%${params.city}%`);

  const sortColumn =
    params.sort === 'title' ? 'title' : params.sort === 'goal_amount' ? 'goal_amount_cents' : 'created_at';
  query = query.order(sortColumn, { ascending: params.sort === 'title' });
  query = query.limit(params.limit ?? 24);

  const { data } = await query;
  return (data ?? []).map(mapCampaign);
}

export async function getPublicCampaignBySlug(slug: string): Promise<PublicCampaign | null> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from('public_campaigns').select('*').eq('slug', slug).maybeSingle();
  return data ? mapCampaign(data) : null;
}

export interface RecentDonation {
  id: string;
  donorLabel: string;
  amountCents: number;
  message: string | null;
  paidAt: string | null;
}

export async function getRecentDonations(campaignId: string, limit = 8): Promise<RecentDonation[]> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('public_recent_donations')
    .select('*')
    .eq('campaign_id', campaignId)
    .order('paid_at', { ascending: false })
    .limit(limit);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? []).map((r: any) => ({
    id: r.id,
    donorLabel: r.donor_label,
    amountCents: Number(r.amount_cents),
    message: r.message ?? null,
    paidAt: r.paid_at ?? null,
  }));
}
