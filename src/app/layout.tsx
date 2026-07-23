import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'Apoie Aqui — Vaquinhas online',
    template: '%s · Apoie Aqui',
  },
  description:
    'Crie sua vaquinha e receba apoio para transformar sua causa em realidade. Uma plataforma da Soma do Bem.',
  robots: { index: false, follow: false }, // ambiente de dev: não indexar
};

export const viewport: Viewport = {
  themeColor: '#F43F82',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
