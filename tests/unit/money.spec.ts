import { test, expect } from '@playwright/test';
import { formatBRL, formatRendimento, formatReais, formatSigned, parseBRL, pushDigit } from '../../src/domain/money';

test.describe('dinheiro', () => {
  test('formata centavos em reais', () => {
    expect(formatBRL(3290)).toBe('R$ 32,90');
  });

  test('separa o milhar com ponto', () => {
    expect(formatBRL(123456)).toBe('R$ 1.234,56');
    expect(formatBRL(1234567890)).toBe('R$ 12.345.678,90');
    expect(formatBRL(5)).toBe('R$ 0,05');
  });

  test('lê o valor que você digitou', () => {
    expect(parseBRL('32,90')).toBe(3290);
    expect(parseBRL('1.234,56')).toBe(123456);
    expect(parseBRL('32')).toBe(3200);
    expect(parseBRL('R$ 7,5')).toBe(750);
    expect(parseBRL(' 0,99 ')).toBe(99);
  });

  test('recusa texto que não é valor', () => {
    for (const invalido of ['abc', '', '   ', '-5', '12,345', '1,2,3', '3.2', 'R$']) {
      expect(parseBRL(invalido), `"${invalido}"`).toBeNull();
    }
  });

  test('mostra o sinal conforme o tipo do lançamento', () => {
    expect(formatSigned(3290, 'despesa')).toBe('\u2212 R$ 32,90');
    expect(formatSigned(85000, 'receita')).toBe('+ R$ 850,00');
    expect(formatSigned(50000, 'investimento')).toBe('R$ 500,00');
  });

  test('digitação estilo caixa de banco: cada dígito entra pela direita', () => {
    let valor = 0;
    const telas: string[] = [];
    for (const d of '3290') {
      valor = pushDigit(valor, d);
      telas.push(formatBRL(valor));
    }
    expect(telas).toEqual(['R$ 0,03', 'R$ 0,32', 'R$ 3,29', 'R$ 32,90']);
  });

  test('arredonda para reais inteiros nos cards pequenos', () => {
    expect(formatReais(935000)).toBe('R$ 9.350');
    expect(formatReais(363165)).toBe('R$ 3.632');
    expect(formatReais(0)).toBe('R$ 0');
  });

  test('mostra valor negativo com o sinal de menos na frente', () => {
    expect(formatBRL(-3290)).toBe('\u2212 R$ 32,90');
    expect(formatBRL(-123456)).toBe('\u2212 R$ 1.234,56');
    expect(formatReais(-363165)).toBe('\u2212 R$ 3.632');
  });

  test('mostra o rendimento em % com seta e vírgula', () => {
    expect(formatRendimento(162000, 150000)).toBe('\u25b2 8,0%');
    expect(formatRendimento(147000, 150000)).toBe('\u25bc 2,0%');
    expect(formatRendimento(150000, 150000)).toBe('0,0%');
    expect(formatRendimento(100, 0)).toBe('0,0%');
  });
});
