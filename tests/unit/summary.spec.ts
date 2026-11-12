import { test, expect } from '@playwright/test';
import { gastosDaCategoria, noMes, summarizeMonth, type Lancamento } from '../../src/domain/summary';

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

  test('a fatura do cartão sai da conta no vencimento; até lá fica a pagar', () => {
    const lancamentos: Lancamento[] = [
      { tipo: 'receita', valor: 850000, categoria: 'Salário', data: '2026-11-05T12:00:00-03:00' },
      { tipo: 'despesa', valor: 3290, categoria: 'Mercado', data: '2026-11-08T12:00:00-03:00' },
      // Compra de outubro na fatura de novembro, que vence dia 11.
      { tipo: 'despesa', valor: 123456, categoria: 'Outros', data: '2026-10-20T12:00:00-03:00', mes: '2026-11', pagoEm: '2026-11-11' },
    ];
    const antes = summarizeMonth(lancamentos, '2026-11', '2026-11-08');
    expect(antes).toMatchObject({ entrou: 850000, saiu: 3290, aPagar: 123456, sobrou: 846710 });
    // Para onde foi o dinheiro: as compras da fatura já contam.
    expect(antes.porCategoria.map((c) => c.categoria)).toEqual(['Outros', 'Mercado']);

    const noVencimento = summarizeMonth(lancamentos, '2026-11', '2026-11-11');
    expect(noVencimento).toMatchObject({ saiu: 126746, aPagar: 0, sobrou: 723254 });

    // Fecha 25 e vence 5: a fatura de outubro sai em novembro.
    const virada: Lancamento[] = [
      { tipo: 'despesa', valor: 1000, categoria: 'Lazer', data: '2026-10-10T12:00:00-03:00', mes: '2026-10', pagoEm: '2026-11-05' },
    ];
    expect(summarizeMonth(virada, '2026-11', '2026-11-08').saiu).toBe(1000);
    expect(summarizeMonth(virada, '2026-10', '2026-11-08').saiu).toBe(0);
  });

  test('VR fica separado da conta, mas o gasto no VR conta em gastos por categoria', () => {
    const d = '2026-11-10T12:00:00-03:00';
    const lancamentos: Lancamento[] = [
      l('receita', 850000, 'Salário', d),
      l('despesa', 30000, 'Mercado', d),
      // Depósito e saldo inicial do VR: não entram em Entrou.
      { tipo: 'receita', valor: 90000, categoria: 'VR', data: d, forma: 'vr', origem: 'vr' },
      { tipo: 'receita', valor: 41230, categoria: 'VR', data: d, forma: 'vr', origem: 'acerto' },
      // Gasto pago com VR: fora do Saiu e do Sobrou, dentro de Alimentação.
      { tipo: 'despesa', valor: 10000, categoria: 'Alimentação', data: d, forma: 'vr' },
      // Acerto para baixo do saldo do VR: não é gasto de categoria nenhuma.
      { tipo: 'despesa', valor: 500, categoria: 'VR', data: d, forma: 'vr', origem: 'acerto' },
    ];

    const r = summarizeMonth(lancamentos, '2026-11');

    expect(r).toMatchObject({ entrou: 850000, saiu: 30000, sobrou: 820000, aPagar: 0 });
    expect(r.porCategoria).toEqual([
      { categoria: 'Mercado', total: 30000, percentual: 75 },
      { categoria: 'Alimentação', total: 10000, percentual: 25 },
    ]);
  });
});

test.describe('gastos de uma categoria no mês', () => {
  const d = (dia: number) => `2026-11-${String(dia).padStart(2, '0')}T12:00:00-03:00`;
  const lancamentos: Lancamento[] = [
    { tipo: 'despesa', valor: 17680, categoria: 'Mercado', data: d(3), forma: 'debito' },
    { tipo: 'despesa', valor: 3290, categoria: 'Mercado', data: d(12), forma: 'pix' },
    { tipo: 'despesa', valor: 10000, categoria: 'Mercado', data: d(10), forma: 'vr' },
    // Compra de outubro na fatura de novembro: conta em novembro, como em "Gastos por categoria".
    { tipo: 'despesa', valor: 33240, categoria: 'Mercado', data: '2026-10-20T12:00:00-03:00', forma: 'credito', mes: '2026-11', pagoEm: '2026-11-11' },
    // Parcela da fatura de dezembro: fica fora de novembro.
    { tipo: 'despesa', valor: 5000, categoria: 'Mercado', data: d(8), forma: 'credito', mes: '2026-12', pagoEm: '2026-12-11' },
    { tipo: 'despesa', valor: 184000, categoria: 'Moradia', data: d(5), forma: 'pix' },
    { tipo: 'receita', valor: 850000, categoria: 'Salário', data: d(5) },
  ];

  test('soma o mês de qualquer jeito que foi pago e separa por forma', () => {
    expect(gastosDaCategoria(lancamentos, '2026-11', 'Mercado')).toEqual({
      categoria: 'Mercado',
      total: 64210,
      quantidade: 4,
      percentual: 26,
      porForma: { debitoPix: 20970, credito: 33240, vr: 10000 },
    });
  });

  test('categoria sem gasto no mês dá zero', () => {
    expect(gastosDaCategoria(lancamentos, '2026-11', 'Lazer')).toEqual({
      categoria: 'Lazer',
      total: 0,
      quantidade: 0,
      percentual: 0,
      porForma: { debitoPix: 0, credito: 0, vr: 0 },
    });
  });

  test('o mesmo critério do resumo: o total bate com "Gastos por categoria"', () => {
    const doResumo = summarizeMonth(lancamentos, '2026-11', '2026-11-12').porCategoria.find((c) => c.categoria === 'Mercado');
    const daCategoria = gastosDaCategoria(lancamentos, '2026-11', 'Mercado');
    expect(daCategoria.total).toBe(doResumo!.total);
    expect(daCategoria.percentual).toBe(doResumo!.percentual);
    expect(noMes(lancamentos[3]!, '2026-11')).toBe(true);
    expect(noMes(lancamentos[4]!, '2026-11')).toBe(false);
  });
});
