import { test, expect } from '@playwright/test';
import { dividirParcelas, mesDaFatura, mesesDasParcelas } from '../../src/domain/parcelas';

test.describe('parcelas no crédito', () => {
  test('divide o total em parcelas; centavos que sobram ficam na 1ª', () => {
    expect(dividirParcelas(120000, 3)).toEqual([40000, 40000, 40000]);
    expect(dividirParcelas(10000, 3)).toEqual([3334, 3333, 3333]);
    expect(dividirParcelas(1000, 1)).toEqual([1000]);
    expect(dividirParcelas(5, 3)).toEqual([3, 1, 1]);
  });

  test('a compra vai para a fatura do mês até a véspera do fechamento; a partir dele, para a seguinte', () => {
    // Fecha dia 3: compra em 2/nov fica em novembro; em 3/nov ou 7/nov vai para dezembro.
    expect(mesDaFatura('2026-11-02T20:00:00-03:00', 3)).toBe('2026-11');
    expect(mesDaFatura('2026-11-03T08:00:00-03:00', 3)).toBe('2026-12');
    expect(mesDaFatura('2026-11-07T12:00:00-03:00', 3)).toBe('2026-12');
    // Virada do ano.
    expect(mesDaFatura('2026-12-28T12:00:00-03:00', 25)).toBe('2027-01');
    // Horário de São Paulo: 3/nov 01h UTC ainda é 2/nov 22h em SP.
    expect(mesDaFatura('2026-11-03T01:00:00Z', 3)).toBe('2026-11');
  });

  test('fechamento no dia 31 vale como o último dia em meses mais curtos', () => {
    expect(mesDaFatura('2026-02-27T12:00:00-03:00', 31)).toBe('2026-02');
    expect(mesDaFatura('2026-02-28T12:00:00-03:00', 31)).toBe('2026-03');
    expect(mesDaFatura('2026-04-29T12:00:00-03:00', 31)).toBe('2026-04');
    expect(mesDaFatura('2026-04-30T12:00:00-03:00', 31)).toBe('2026-05');
  });

  test('lista os meses de cada parcela a partir da 1ª fatura', () => {
    expect(mesesDasParcelas('2026-12', 3)).toEqual(['2026-12', '2027-01', '2027-02']);
    expect(mesesDasParcelas('2026-05', 1)).toEqual(['2026-05']);
  });
});
