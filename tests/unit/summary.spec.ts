import { test, expect } from '@playwright/test';
import { summarizeMonth, type Lancamento } from '../../src/domain/summary';

const l = (tipo: Lancamento['tipo'], valor: number, categoria: string, data: string): Lancamento => ({ tipo, valor, categoria, data });

test.describe('resumo do mês', () => {
  test('calcula entrou, saiu, investiu e sobrou', () => {
    const novembro = [
      l('receita', 850000, 'Salário', '2026-11-05T09:00:00-03:00'),
      l('receita', 85000, 'Renda extra', '2026-11-06T18:00:00-03:00'),
      l('despesa', 3290, 'Mercado', '2026-11-07T10:00:00-03:00'),
      l('despesa', 160000, 'Moradia', '2026-11-05T12:00:00-03:00'),
      l('despesa', 1840, 'Transporte', '2026-11-07T08:00:00-03:00'),
      l('investimento', 150000, 'Tesouro Selic', '2026-11-05T13:00:00-03:00'),
    ];

    const r = summarizeMonth(novembro, '2026-11');

    expect(r.entrou).toBe(935000); // R$ 9.350,00
    expect(r.saiu).toBe(165130); // R$ 1.651,30
    expect(r.investiu).toBe(150000); // R$ 1.500,00
    expect(r.sobrou).toBe(619870); // R$ 6.198,70
  });

  test('só conta o mês pedido, no horário de São Paulo', () => {
    const lancamentos = [
      // 31/10 às 23h30 em São Paulo já é 1/11 em UTC — continua sendo outubro.
      l('despesa', 1000, 'Mercado', '2026-10-31T23:30:00-03:00'),
      // 30/11 às 23h30 em São Paulo já é 1/12 em UTC — continua sendo novembro.
      l('despesa', 2000, 'Mercado', '2026-11-30T23:30:00-03:00'),
      // Gravado em UTC: 1/11 às 02h00 UTC = 31/10 às 23h00 em São Paulo — outubro.
      l('despesa', 4000, 'Mercado', '2026-11-01T02:00:00Z'),
      l('receita', 8000, 'Salário', '2026-12-01T00:00:00-03:00'),
    ];

    const r = summarizeMonth(lancamentos, '2026-11');

    expect(r.saiu).toBe(2000);
    expect(r.entrou).toBe(0);
  });

  test('agrupa gastos por categoria, do maior para o menor, com "Outros" a partir da 7ª', () => {
    const d = '2026-11-10T12:00:00-03:00';
    const lancamentos = [
      l('despesa', 2100, 'Presentes', d),
      l('despesa', 3290, 'Mercado', d),
      l('despesa', 160000, 'Moradia', d),
      l('despesa', 25450, 'Lazer', d),
      l('despesa', 43610, 'Transporte', d),
      l('despesa', 72950, 'Mercado', d),
      l('despesa', 5000, 'Pets', d),
      l('despesa', 36200, 'Alimentação', d),
      l('despesa', 14500, 'Saúde', d),
      l('receita', 850000, 'Salário', d),
      l('investimento', 50000, 'Tesouro Selic', d),
    ];

    const r = summarizeMonth(lancamentos, '2026-11');

    expect(r.saiu).toBe(363100);
    expect(r.porCategoria).toEqual([
      { categoria: 'Moradia', total: 160000, percentual: 44 },
      { categoria: 'Mercado', total: 76240, percentual: 21 },
      { categoria: 'Transporte', total: 43610, percentual: 12 },
      { categoria: 'Alimentação', total: 36200, percentual: 10 },
      { categoria: 'Lazer', total: 25450, percentual: 7 },
      { categoria: 'Saúde', total: 14500, percentual: 4 },
      { categoria: 'Outros', total: 7100, percentual: 2 },
    ]);
  });

  test('parcela conta no mês da fatura (competência), não no dia da compra', () => {
    const compra = '2026-11-07T12:00:00-03:00';
    const lancamentos: Lancamento[] = [
      { tipo: 'despesa', valor: 40000, categoria: 'Lazer', data: compra, mes: '2026-12' },
      { tipo: 'despesa', valor: 40000, categoria: 'Lazer', data: compra, mes: '2027-01' },
      l('despesa', 3290, 'Mercado', compra),
    ];

    expect(summarizeMonth(lancamentos, '2026-11').saiu).toBe(3290);
    expect(summarizeMonth(lancamentos, '2026-12').saiu).toBe(40000);
    expect(summarizeMonth(lancamentos, '2027-01').saiu).toBe(40000);
  });
});
