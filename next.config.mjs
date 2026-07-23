/** @type {import('next').NextConfig} */

const isDev = process.env.NODE_ENV !== 'production';

// Supabase origin usado por CSP (connect-src / img-src para Storage).
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const supabaseOrigin = supabaseUrl ? new URL(supabaseUrl).origin : '';

// CSP: em dev afrouxamos para o HMR do Next; em prod é mais restrita.
// TODO(hardening): migrar para nonce por request (docs/06-security-and-privacy.md).
const csp = [
  `default-src 'self'`,
  `base-uri 'self'`,
  `form-action 'self'`,
  `frame-ancestors 'none'`,
  `object-src 'none'`,
  `img-src 'self' data: blob: ${supabaseOrigin}`,
  `font-src 'self' data:`,
  `style-src 'self' 'unsafe-inline'`,
  isDev
    ? `script-src 'self' 'unsafe-inline' 'unsafe-eval'`
    : `script-src 'self' 'unsafe-inline'`,
  `connect-src 'self' ${supabaseOrigin} ${isDev ? 'ws: wss:' : ''}`.trim(),
  `upgrade-insecure-requests`,
]
  .filter(Boolean)
  .join('; ');

const securityHeaders = [
  { key: 'Content-Security-Policy', value: csp },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), browsing-topics=()',
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  { key: 'X-DNS-Prefetch-Control', value: 'off' },
];

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    remotePatterns: supabaseOrigin
      ? [{ protocol: 'https', hostname: new URL(supabaseOrigin).hostname }]
      : [],
  },
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};

export default nextConfig;
