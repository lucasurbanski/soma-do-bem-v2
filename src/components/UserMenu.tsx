'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

export function UserMenu({
  fullName,
  isStaff,
}: {
  fullName: string | null;
  isStaff: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  async function signOut() {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  }

  const first = (fullName ?? 'Você').split(' ')[0];

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="btn-outline"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        Olá, {first}
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 z-30 mt-2 w-52 overflow-hidden rounded-xl border border-surface-line bg-white shadow-card"
        >
          <Link href="/painel" className="block px-4 py-2.5 text-sm hover:bg-brand-50" role="menuitem">
            Meu painel
          </Link>
          <Link href="/painel/vaquinhas" className="block px-4 py-2.5 text-sm hover:bg-brand-50" role="menuitem">
            Minhas vaquinhas
          </Link>
          {isStaff && (
            <Link href="/admin" className="block px-4 py-2.5 text-sm hover:bg-brand-50" role="menuitem">
              Administração
            </Link>
          )}
          <button
            type="button"
            onClick={signOut}
            className="block w-full px-4 py-2.5 text-left text-sm text-brand-600 hover:bg-brand-50"
            role="menuitem"
          >
            Sair
          </button>
        </div>
      )}
    </div>
  );
}
