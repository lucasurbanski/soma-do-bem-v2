import Link from 'next/link';

/** Logo "apoie aqui" com coração — identidade rosa/roxo do legado. */
export function Logo({ className = '' }: { className?: string }) {
  return (
    <Link href="/" className={`inline-flex items-center gap-2 ${className}`} aria-label="Apoie Aqui — início">
      <span aria-hidden className="relative inline-block h-8 w-9">
        <svg viewBox="0 0 36 32" className="h-8 w-9" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M18 29S3 20.5 3 11.5A7.5 7.5 0 0 1 18 8a7.5 7.5 0 0 1 15 3.5C33 20.5 18 29 18 29Z"
            stroke="url(#g)"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
          <defs>
            <linearGradient id="g" x1="3" y1="4" x2="33" y2="29" gradientUnits="userSpaceOnUse">
              <stop stopColor="#F43F82" />
              <stop offset="1" stopColor="#8B5CF6" />
            </linearGradient>
          </defs>
        </svg>
      </span>
      <span className="text-lg font-extrabold leading-none tracking-tight">
        <span className="text-ink">apoie</span>{' '}
        <span className="text-brand-500">aqui</span>
      </span>
    </Link>
  );
}
