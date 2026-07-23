import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-surface-warm px-4 text-center">
      <p className="text-6xl">🔍</p>
      <h1 className="mt-4 text-2xl font-bold text-ink">Página não encontrada</h1>
      <p className="mt-2 max-w-md text-ink-soft">
        O conteúdo que você procura não existe ou foi movido.
      </p>
      <Link href="/" className="btn-primary mt-6">
        Voltar para o início
      </Link>
    </div>
  );
}
