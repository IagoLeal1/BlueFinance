import { test, expect } from '@playwright/test';
import { mesDaUrl, mesesRecentes, opcoesDeMes, rotuloDoDia, tituloDoMes } from '../../src/domain/datas';

test.describe('datas', () => {
  test('dá nome ao dia de um lançamento no horário de São Paulo', () => {
    const agora = new Date('2026-11-07T15:00:00-03:00');
    expect(rotuloDoDia('2026-11-07T00:10:00-03:00', agora)).toBe('Hoje · 7 nov');
    expect(rotuloDoDia('2026-11-07T02:30:00Z', agora)).toBe('Ontem · 6 nov'); // 23h30 do dia 6 em SP
    expect(rotuloDoDia('2026-11-05T12:00:00-03:00', agora)).toBe('5 nov');
    expect(rotuloDoDia('2025-12-24T12:00:00-03:00', agora)).toBe('24 dez 2025');
  });

  test('mês da URL: aceita meses válidos até 24 à frente (parcelas), recusa além disso e lixo', () => {
    const agora = new Date('2026-11-07T15:00:00-03:00');
    expect(mesDaUrl('2026-10', agora)).toBe('2026-10');
    expect(mesDaUrl('2025-12', agora)).toBe('2025-12');
    expect(mesDaUrl('2026-12', agora)).toBe('2026-12');
    expect(mesDaUrl('2028-11', agora)).toBe('2028-11');
    for (const ruim of ['2028-12', '2026-13', 'outubro', '', undefined, ['2026-10']]) {
      expect(mesDaUrl(ruim as string | undefined, agora), String(ruim)).toBe('2026-11');
    }
  });

  test('lista os últimos meses atravessando a virada do ano', () => {
    const agora = new Date('2026-02-10T12:00:00-03:00');
    expect(mesesRecentes(agora, 4)).toEqual(['2026-02', '2026-01', '2025-12', '2025-11']);
    expect(tituloDoMes('2026-01', agora)).toBe('Janeiro');
    expect(tituloDoMes('2025-12', agora)).toBe('Dezembro de 2025');
  });

  test('o seletor de mês inclui os meses à frente até a última parcela', () => {
    const agora = new Date('2026-11-07T12:00:00-03:00');
    const opcoes = opcoesDeMes(agora, '2027-01');
    expect(opcoes.slice(0, 4).map((o) => o.titulo)).toEqual(['Janeiro de 2027', 'Dezembro de 2026', 'Novembro de 2026', 'Outubro de 2026']);
    expect(opcoes).toHaveLength(14);
    expect(opcoes.filter((o) => o.hoje).map((o) => o.mes)).toEqual(['2026-11']);
    // Sem parcelas à frente: só os últimos 12, começando pelo atual.
    expect(opcoesDeMes(agora, null).map((o) => o.mes).slice(0, 2)).toEqual(['2026-11', '2026-10']);
    expect(opcoesDeMes(agora, null)).toHaveLength(12);
  });
});
