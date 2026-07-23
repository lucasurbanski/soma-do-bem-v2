import Link from 'next/link';
import { Logo } from './Logo';

const cols: { title: string; links: { label: string; href: string }[] }[] = [
  {
    title: 'Links rápidos',
    links: [
      { label: 'Política de privacidade', href: '/politica-de-privacidade' },
      { label: 'Termos de uso', href: '/termos-de-uso' },
      { label: 'Dúvidas frequentes', href: '/duvidas' },
      { label: 'Acesse sua conta', href: '/login' },
    ],
  },
  {
    title: 'Sobre',
    links: [
      { label: 'Como funciona', href: '/como-funciona' },
      { label: 'Quem somos', href: '/sobre' },
      { label: 'Taxas e prazos', href: '/taxas-e-prazos' },
      { label: 'Criar uma vaquinha', href: '/criar-vaquinha' },
    ],
  },
  {
    title: 'Contato',
    links: [
      { label: 'Fale conosco', href: '/contato' },
      { label: 'Trabalhe conosco', href: '/contato' },
    ],
  },
];

export function Footer() {
  return (
    <footer className="mt-16 border-t border-surface-line bg-white">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:grid-cols-2 md:grid-cols-4">
        <div className="space-y-3">
          <Logo />
          <p className="max-w-xs text-sm text-ink-soft">
            A Soma do Bem é uma empresa orgulhosamente catarinense, nascida em Joinville, com pessoas
            em todo o Brasil trabalhando para transformar milhares de causas todos os dias.
          </p>
        </div>
        {cols.map((c) => (
          <div key={c.title}>
            <h3 className="mb-3 text-sm font-bold text-ink">{c.title}</h3>
            <ul className="space-y-2">
              {c.links.map((l) => (
                <li key={l.label}>
                  <Link href={l.href} className="text-sm text-ink-soft hover:text-brand-600">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-surface-line py-4 text-center text-xs text-ink-soft">
        © {new Date().getFullYear()} Soma do Bem · Apoie Aqui
      </div>
    </footer>
  );
}
