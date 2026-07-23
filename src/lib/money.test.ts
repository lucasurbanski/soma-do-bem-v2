import { describe, it, expect } from 'vitest';
import { applyBps, assertCents, formatBRL, progressPercent, reaisToCents } from './money';

describe('money — centavos inteiros', () => {
  it('assertCents rejeita não-inteiros', () => {
    expect(() => assertCents(10.5)).toThrow();
    expect(() => assertCents(100)).not.toThrow();
  });

  it('applyBps calcula taxa em basis points com arredondamento', () => {
    expect(applyBps(10_000, 500)).toBe(500); // 5% de R$100,00 = R$5,00
    expect(applyBps(99, 99)).toBe(1); // 0,99% de 99c ~ 0,98c -> 1c
    expect(applyBps(10_000, 0)).toBe(0);
  });

  it('reaisToCents entende formatos pt-BR e simples', () => {
    expect(reaisToCents('1.234,56')).toBe(123456);
    expect(reaisToCents('R$ 10,00')).toBe(1000);
    expect(reaisToCents('10')).toBe(1000);
    expect(reaisToCents('10.50')).toBe(1050);
    expect(reaisToCents(25)).toBe(2500);
  });

  it('formatBRL formata centavos', () => {
    expect(formatBRL(108586)).toBe('R$ 1.085,86');
    expect(formatBRL(0)).toBe('R$ 0,00');
  });

  it('progressPercent limita a 100 e trata meta zero', () => {
    expect(progressPercent(1800, 10000)).toBe(18);
    expect(progressPercent(20000, 10000)).toBe(100);
    expect(progressPercent(100, 0)).toBe(0);
  });
});
