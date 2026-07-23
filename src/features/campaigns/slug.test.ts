import { describe, it, expect } from 'vitest';
import { buildSlug, generateUniqueSlug, randomSuffix, slugifyTitle } from './slug';

describe('slug de campanha', () => {
  it('normaliza acentos e espaços', () => {
    expect(slugifyTitle('Ajude a Construção do Coração!')).toBe('ajude-a-construcao-do-coracao');
    expect(slugifyTitle('  Vaquinha   do  João  ')).toBe('vaquinha-do-joao');
  });

  it('buildSlug adiciona sufixo', () => {
    expect(buildSlug('Ajude a testar o site', '7c8f61d2')).toBe('ajude-a-testar-o-site-7c8f61d2');
  });

  it('slug vazio vira "vaquinha"', () => {
    expect(buildSlug('!!!', 'abcd1234')).toBe('vaquinha-abcd1234');
  });

  it('randomSuffix gera hex do tamanho esperado', () => {
    expect(randomSuffix(4)).toMatch(/^[0-9a-f]{8}$/);
  });

  it('generateUniqueSlug tenta novo sufixo em colisão', async () => {
    let calls = 0;
    const exists = async (_slug: string) => {
      calls += 1;
      return calls === 1; // primeiro colide, segundo é livre
    };
    const slug = await generateUniqueSlug('Título de Teste', exists);
    expect(slug.startsWith('titulo-de-teste-')).toBe(true);
    expect(calls).toBe(2);
  });
});
