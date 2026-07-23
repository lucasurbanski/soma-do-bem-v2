import type { Metadata } from 'next';
import { CampaignCard } from '@/components/CampaignCard';
import { getCategories, listPublicCampaigns, type ListParams } from '@/features/campaigns/queries';

export const metadata: Metadata = { title: 'Encontre uma vaquinha para apoiar' };
export const dynamic = 'force-dynamic';

type SP = Promise<Record<string, string | string[] | undefined>>;

function str(v: string | string[] | undefined): string {
  return Array.isArray(v) ? (v[0] ?? '') : (v ?? '');
}

export default async function CausesPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const q = str(sp.q);
  const category = str(sp.category);
  const city = str(sp.city);
  const sortRaw = str(sp.sort);
  const sort = (['created_at', 'title', 'goal_amount'].includes(sortRaw) ? sortRaw : 'created_at') as
    ListParams['sort'];

  const [categories, campaigns] = await Promise.all([
    getCategories(),
    listPublicCampaigns({ q, category, city, sort }),
  ]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-2xl font-bold text-ink">Encontre uma vaquinha para apoiar</h1>
      <p className="mt-1 text-ink-soft">Busque facilmente a campanha que você quer apoiar.</p>

      {/* Filtros (GET) */}
      <form className="card mt-6 grid gap-4 p-5 md:grid-cols-[1fr_1fr_1fr_auto] md:items-end" role="search">
        <div>
          <label className="label" htmlFor="q">
            Busque uma vaquinha
          </label>
          <input id="q" name="q" defaultValue={q} placeholder="Digite o nome da causa" className="input" />
        </div>
        <div>
          <label className="label" htmlFor="city">
            Localização
          </label>
          <input id="city" name="city" defaultValue={city} placeholder="Cidade" className="input" />
        </div>
        <div>
          <label className="label" htmlFor="sort">
            Ordenar
          </label>
          <select id="sort" name="sort" defaultValue={sort} className="input">
            <option value="created_at">Mais recentes</option>
            <option value="title">Título</option>
            <option value="goal_amount">Meta</option>
          </select>
        </div>
        <button type="submit" className="btn-primary h-[42px]">
          Buscar
        </button>

        {/* Categorias como chips */}
        <div className="md:col-span-4">
          <div className="flex flex-wrap gap-2">
            <CategoryChip active={!category} label="Todas" href={buildHref({ q, city, sort })} />
            {categories.map((c) => (
              <CategoryChip
                key={c.id}
                active={category === c.slug}
                label={c.name}
                href={buildHref({ q, city, sort, category: c.slug })}
              />
            ))}
          </div>
        </div>
      </form>

      <p className="mt-6 text-sm text-ink-soft">
        {campaigns.length} vaquinha{campaigns.length === 1 ? '' : 's'} encontrada
        {campaigns.length === 1 ? '' : 's'}
      </p>

      {campaigns.length > 0 ? (
        <div className="mt-4 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {campaigns.map((c) => (
            <CampaignCard key={c.id} c={c} />
          ))}
        </div>
      ) : (
        <div className="card mt-4 p-10 text-center text-ink-soft">
          Nenhuma vaquinha encontrada com esses filtros.
        </div>
      )}
    </div>
  );
}

function buildHref(params: Record<string, string | undefined>): string {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v) qs.set(k, v);
  const s = qs.toString();
  return `/causes${s ? `?${s}` : ''}`;
}

function CategoryChip({ active, label, href }: { active: boolean; label: string; href: string }) {
  return (
    <a
      href={href}
      className={`badge border px-3 py-1.5 ${
        active
          ? 'border-brand-500 bg-brand-500 text-white'
          : 'border-surface-line bg-white text-ink-muted hover:bg-brand-50'
      }`}
    >
      {label}
    </a>
  );
}
