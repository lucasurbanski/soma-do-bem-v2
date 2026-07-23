import Link from 'next/link';
import { Logo } from './Logo';
import { UserMenu } from './UserMenu';
import { getSessionUser, isStaff } from '@/features/auth/session';

export async function Header() {
  const user = await getSessionUser();

  return (
    <header className="sticky top-0 z-20 border-b border-surface-line bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3">
        <Logo />

        <form action="/causes" className="ml-2 hidden flex-1 md:block" role="search">
          <input
            type="search"
            name="q"
            placeholder="Pesquisar vaquinhas"
            aria-label="Pesquisar vaquinhas"
            className="input max-w-md"
          />
        </form>

        <nav className="ml-auto flex items-center gap-1 md:gap-2" aria-label="Principal">
          <Link href="/causes" className="btn-ghost hidden sm:inline-flex">
            Causas
          </Link>
          <Link href="/como-funciona" className="btn-ghost hidden sm:inline-flex">
            Como funciona
          </Link>
          <Link href="/sobre" className="btn-ghost hidden md:inline-flex">
            Sobre
          </Link>
          {user ? (
            <UserMenu fullName={user.fullName} isStaff={isStaff(user)} />
          ) : (
            <>
              <Link href="/login" className="btn-ghost">
                Entrar
              </Link>
              <Link href="/criar-vaquinha" className="btn-primary">
                Criar vaquinha
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
