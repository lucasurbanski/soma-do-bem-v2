'use client';

export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-surface-warm px-4 text-center">
      <p className="text-6xl">😕</p>
      <h1 className="mt-4 text-2xl font-bold text-ink">Algo deu errado</h1>
      <p className="mt-2 max-w-md text-ink-soft">
        Tivemos um problema ao carregar esta página. Tente novamente em instantes.
      </p>
      <button onClick={reset} className="btn-primary mt-6">
        Tentar novamente
      </button>
    </div>
  );
}
