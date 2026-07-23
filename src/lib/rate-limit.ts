import 'server-only';

/**
 * Rate limiting simples em memória (janela deslizante por chave).
 * MVP/dev: suficiente para uma instância. Em produção multi-instância,
 * trocar por Upstash/Redis (ver docs/06-security-and-privacy.md).
 */
type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  resetAt: number;
}

export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const existing = buckets.get(key);
  if (!existing || existing.resetAt <= now) {
    const resetAt = now + windowMs;
    buckets.set(key, { count: 1, resetAt });
    return { ok: true, remaining: limit - 1, resetAt };
  }
  existing.count += 1;
  const ok = existing.count <= limit;
  return { ok, remaining: Math.max(0, limit - existing.count), resetAt: existing.resetAt };
}

/** Extrai um identificador de cliente a partir dos headers (IP). */
export function clientKey(headers: Headers, prefix: string): string {
  const fwd = headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  const ip = fwd || headers.get('x-real-ip') || 'unknown';
  return `${prefix}:${ip}`;
}
