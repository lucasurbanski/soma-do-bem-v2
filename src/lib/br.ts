/** Utilidades para documentos/formatos brasileiros. */

/** Mantém apenas dígitos. */
export function onlyDigits(v: string): string {
  return v.replace(/\D/g, '');
}

/** Valida CPF (11 dígitos + dígitos verificadores). */
export function isValidCpf(input: string): boolean {
  const cpf = onlyDigits(input);
  if (cpf.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cpf)) return false; // todos iguais

  const calc = (base: string, factor: number): number => {
    let sum = 0;
    for (const digit of base) sum += Number(digit) * factor--;
    const rest = (sum * 10) % 11;
    return rest === 10 ? 0 : rest;
  };

  const d1 = calc(cpf.slice(0, 9), 10);
  const d2 = calc(cpf.slice(0, 10), 11);
  return d1 === Number(cpf[9]) && d2 === Number(cpf[10]);
}

/** Mascara CPF para exibição segura: 123.456.789-01 -> ***.***.789-01 */
export function maskCpf(input: string): string {
  const cpf = onlyDigits(input);
  if (cpf.length !== 11) return '***.***.***-**';
  return `***.***.${cpf.slice(6, 9)}-${cpf.slice(9)}`;
}

/** Normaliza telefone BR para E.164 aproximado (+55...). */
export function toE164BR(input: string): string | null {
  const d = onlyDigits(input);
  if (d.length === 11 || d.length === 10) return `+55${d}`;
  if (d.length === 13 && d.startsWith('55')) return `+${d}`;
  return null;
}
