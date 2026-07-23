/**
 * Geração de slug de campanha. Padrão observado no legado:
 *   "<titulo-normalizado>-<sufixo-hex-de-8>"  (ex.: ajude-a-testar-o-site-7c8f61d2)
 * A unicidade é garantida checando no banco (existsFn) e, se preciso, gerando novo sufixo.
 */

/** Normaliza um texto para kebab-case sem acentos. Puro. */
export function slugifyTitle(title: string): string {
  return title
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // remove acentos
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    .replace(/-+$/g, '');
}

/** Monta o slug final combinando base + sufixo. Puro. */
export function buildSlug(title: string, suffix: string): string {
  const base = slugifyTitle(title) || 'vaquinha';
  return `${base}-${suffix}`;
}

/** Sufixo hexadecimal aleatório (8 chars). Usa Web Crypto (Edge/Node). */
export function randomSuffix(bytes = 4): string {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Gera um slug único consultando existsFn (retorna true se já existe).
 * Tenta algumas vezes com novo sufixo antes de desistir.
 */
export async function generateUniqueSlug(
  title: string,
  existsFn: (slug: string) => Promise<boolean>,
  maxAttempts = 5,
): Promise<string> {
  for (let i = 0; i < maxAttempts; i++) {
    const candidate = buildSlug(title, randomSuffix());
    if (!(await existsFn(candidate))) {
      return candidate;
    }
  }
  // fallback praticamente impossível de colidir
  return buildSlug(title, randomSuffix(8));
}
