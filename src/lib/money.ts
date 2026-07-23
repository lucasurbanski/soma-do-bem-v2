/**
 * Dinheiro SEMPRE em centavos inteiros (BRL). Nunca float para valores monetários.
 * Todas as funções aqui são puras e testáveis (ver money.test.ts).
 */

export type Cents = number;

export function assertCents(value: number): asserts value is Cents {
  if (!Number.isInteger(value)) {
    throw new Error(`Valor monetário deve ser inteiro em centavos, recebido: ${value}`);
  }
  if (!Number.isSafeInteger(value)) {
    throw new Error(`Valor monetário fora do intervalo seguro: ${value}`);
  }
}

/** Aplica taxa em basis points (1 bp = 0,01%). Ex.: bps=500 => 5%. Arredonda p/ centavo. */
export function applyBps(amountCents: Cents, bps: number): Cents {
  assertCents(amountCents);
  if (!Number.isInteger(bps) || bps < 0) {
    throw new Error(`bps inválido: ${bps}`);
  }
  // arredondamento "half away from zero" para valores não-negativos = Math.round
  return Math.round((amountCents * bps) / 10_000);
}

/** Converte string em reais ("1.234,56" ou "1234.56" ou "10") para centavos. */
export function reaisToCents(input: string | number): Cents {
  if (typeof input === 'number') {
    return Math.round(input * 100);
  }
  const cleaned = input
    .trim()
    .replace(/[R$\s]/g, '')
    .replace(/\.(?=\d{3}(\D|$))/g, '') // remove separador de milhar
    .replace(',', '.');
  const value = Number(cleaned);
  if (Number.isNaN(value)) {
    throw new Error(`Valor monetário inválido: ${input}`);
  }
  return Math.round(value * 100);
}

/** Formata centavos como moeda BRL: 108586 -> "R$ 1.085,86". */
export function formatBRL(cents: Cents): string {
  assertCents(cents);
  return (cents / 100)
    .toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    })
    // Normaliza espaços especiais (NBSP/NNBSP) que o Intl insere após "R$".
    .replace(/[  ]/g, ' ');
}

/** Percentual de progresso (0..100), inteiro, limitado a 100. */
export function progressPercent(raisedCents: Cents, goalCents: Cents): number {
  if (goalCents <= 0) return 0;
  return Math.min(100, Math.floor((raisedCents / goalCents) * 100));
}
