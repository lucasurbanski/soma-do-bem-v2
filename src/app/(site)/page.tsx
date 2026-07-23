import Link from 'next/link';
import { CampaignCard } from '@/components/CampaignCard';
import { listPublicCampaigns } from '@/features/campaigns/queries';

const benefits = [
  { icon: '💗', text: 'Crie sua vaquinha grátis' },
  { icon: '🎁', text: 'Receba R$ 10 ao criar sua vaquinha' },
  { icon: '✅', text: 'Primeiro saque sem taxa' },
];

const faqs = [
  {
    q: 'Como funciona uma vaquinha online?',
    a: 'Você cria sua vaquinha em poucos minutos, conta sua história, define uma meta e compartilha o link. As pessoas contribuem por Pix e você acompanha tudo pelo seu painel.',
  },
  {
    q: 'Preciso ter conta no banco para criar?',
    a: 'Para criar e divulgar sua vaquinha, não. Os dados para recebimento só são solicitados quando você for sacar o valor arrecadado.',
  },
  {
    q: 'Quais as taxas para criar uma vaquinha?',
    a: 'Criar é gratuito. A plataforma cobra uma taxa apenas sobre as contribuições recebidas, usada para manter o serviço seguro. Os valores vigentes ficam sempre na página de Taxas e prazos.',
  },
];

export default async function HomePage() {
  const featured = await listPublicCampaigns({ limit: 6 });

  return (
    <div>
      {/* HERO */}
      <section className="bg-gradient-to-b from-brand-50 to-surface-warm">
        <div className="mx-auto max-w-4xl px-4 py-16 text-center">
          <h1 className="text-3xl font-extrabold leading-tight text-ink sm:text-4xl">
            Crie sua vaquinha e nós fazemos{' '}
            <span className="text-accentPurple">a primeira contribuição</span> para você.
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-ink-muted">
            Você sonha, cria e compartilha. Nós damos o pontapé inicial para que sua vaquinha já
            comece inspirando confiança e atraindo apoiadores.
          </p>
          <div className="mt-8">
            <Link href="/criar-vaquinha" className="btn-primary px-8 py-3 text-base">
              Dê o primeiro passo agora
            </Link>
          </div>
          <div className="mx-auto mt-10 flex max-w-3xl flex-wrap items-center justify-center gap-4 rounded-xl border border-amber-200 bg-amber-50/60 px-6 py-4 text-sm text-ink-muted">
            {benefits.map((b) => (
              <span key={b.text} className="inline-flex items-center gap-2">
                <span aria-hidden>{b.icon}</span>
                {b.text}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* HISTÓRIAS EM DESTAQUE */}
      <section className="mx-auto max-w-6xl px-4 py-14">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-ink">
            Histórias que <span className="text-brand-500">estão em destaque</span>
          </h2>
          <p className="text-ink-soft">Histórias reais de pessoas que precisam da sua ajuda.</p>
        </div>

        {featured.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((c) => (
              <CampaignCard key={c.id} c={c} />
            ))}
          </div>
        ) : (
          <div className="card p-10 text-center text-ink-soft">
            <p className="text-lg">Ainda não há vaquinhas publicadas.</p>
            <p className="mt-2 text-sm">
              Seja o primeiro a compartilhar uma causa.{' '}
              <Link href="/criar-vaquinha" className="font-semibold text-brand-600">
                Criar vaquinha
              </Link>
            </p>
          </div>
        )}

        <div className="mt-8 text-center">
          <Link href="/causes" className="btn-outline">
            Ver mais histórias
          </Link>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-white py-14">
        <div className="mx-auto max-w-5xl px-4">
          <h2 className="mb-2 text-2xl font-bold text-ink">
            Você é <span className="text-brand-500">novo por aqui?</span>
          </h2>
          <p className="mb-8 text-ink-soft">
            Então vamos ajudar a tirar as principais dúvidas de quem está começando.
          </p>
          <div className="grid gap-4 md:grid-cols-3">
            {faqs.map((f) => (
              <div key={f.q} className="card p-6">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-brand-500">
                  Dúvida
                </p>
                <h3 className="mb-2 font-bold text-ink">{f.q}</h3>
                <p className="text-sm text-ink-muted">{f.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-4 py-14">
        <div className="rounded-2xl bg-gradient-to-r from-brand-500 to-accentPurple px-8 py-12 text-center text-white">
          <h2 className="text-2xl font-bold">Aqui, sua causa encontra o apoio que merece.</h2>
          <p className="mx-auto mt-3 max-w-2xl text-white/90">
            Na Soma do Bem, conectamos sua história a pessoas dispostas a ajudar. De forma simples e
            segura, você cria sua vaquinha e começa a receber contribuições.
          </p>
          <Link
            href="/criar-vaquinha"
            className="btn mt-6 bg-white px-8 py-3 text-base font-semibold text-brand-600 hover:bg-brand-50"
          >
            Dê o primeiro passo agora
          </Link>
        </div>
      </section>
    </div>
  );
}
