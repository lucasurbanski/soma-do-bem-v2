import { describe, it, expect } from 'vitest';
import { isValidCpf, maskCpf, onlyDigits, toE164BR } from './br';

describe('br — CPF e telefone', () => {
  it('valida CPFs corretos e rejeita inválidos', () => {
    expect(isValidCpf('529.982.247-25')).toBe(true); // CPF válido conhecido
    expect(isValidCpf('111.111.111-11')).toBe(false);
    expect(isValidCpf('123.456.789-00')).toBe(false);
    expect(isValidCpf('529.982.247-2')).toBe(false);
  });

  it('mascara CPF sem expor os primeiros dígitos', () => {
    expect(maskCpf('52998224725')).toBe('***.***.247-25');
    expect(maskCpf('abc')).toBe('***.***.***-**');
  });

  it('onlyDigits limpa a string', () => {
    expect(onlyDigits('(47) 99999-8888')).toBe('47999998888');
  });

  it('converte telefone para E.164', () => {
    expect(toE164BR('(47) 99999-8888')).toBe('+5547999998888');
    expect(toE164BR('4733334444')).toBe('+554733334444');
    expect(toE164BR('123')).toBeNull();
  });
});
