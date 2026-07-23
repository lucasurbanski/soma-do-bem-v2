import Link from 'next/link';
import { requireStaff } from '@/features/auth/session';
import { Logo } from '@/components/Logo';

const nav = [
  { href: '/admin', label: 'Visão geral' },
  { href: '/admin/moderacao', label: 'Moderação' },
  { href: '/admin/vaquinhas', label: 'Vaquinhas' },
  { href: '/admin/doacoes', label: 'Doações' },
  { href: '/admin/ledger', label: 'Ledger' },
  { href: '/admin/webhooks', label: 'Webhooks' },
  { href: '/admin/denuncias', label: 'Denúncias' },
  { href: '/admin/usuarios', label: 'Usuários' },
  { href: '/admin/auditoria', label: 'Auditoria' },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireStaff();
  return (
    <div className="grid min-h-screen grid-cols-[220px_1fr]">
      <aside className="flex flex-col border-r border-surface-line bg-white p-4">
        <div className="mb-6">
          <Logo />
          <p className="mt-1 text-xs text-ink-soft">Administração</p>
        </div>
        <nav className="flex flex-col gap-1">
          {nav.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className="rounded-lg px-3 py-2 text-sm text-ink hover:bg-brand-50"
            >
              {n.label}
            </Link>
          ))}
        </nav>
        <Link href="/" className="mt-auto text-xs text-ink-soft hover:text-brand-600">
          ← Voltar ao site
        </Link>
      </aside>
      <main className="overflow-x-auto bg-surface-warm p-6">{children}</main>
    </div>
  );
}
