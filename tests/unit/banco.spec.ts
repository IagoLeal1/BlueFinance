import { test, expect } from '@playwright/test';
import {
  acharPar,
  categoriaSugerida,
  escolherCartao,
  estabelecimentoDe,
  lerTransacao,
  linhasDoLancamento,
  motivoDeFora,
  nomeDe,
  type Candidato,
  type TransacaoPluggy,
} from '../../src/domain/banco';

/** Transação como a Pluggy manda: data à meia-noite UTC (o dia), valor em reais. */
const t = (extra: Partial<TransacaoPluggy>): TransacaoPluggy => ({
  id: 'p1',
  description: 'COMPRA',
  amount: -10,
  date: '2026-11-17T00:00:00.000Z',
  type: 'DEBIT',
  ...extra,
});

test.describe('Open Finance: ler a transação do banco', () => {
  test('conta: saída é despesa, entrada é receita; Pix pelo meio de pagamento ou pela descrição', () => {
    expect(lerTransacao('BANK', t({ id: 'a', description: 'UBER *TRIP', amount: -23.7, paymentData: { paymentMethod: 'PIX' } }))).toEqual({
      pluggyId: 'a',
      conta: 'conta',
      tipo: 'despesa',
      forma: 'pix',
      valor: 2370,
      parcelas: 1,
      data: '2026-11-17T12:00:00-03:00',
      descricao: 'UBER *TRIP',
      estabelecimento: 'UBER *TRIP',
      nome: 'Uber *trip',
      categoriaPluggy: null,
    });
    expect(lerTransacao('BANK', t({ description: 'PIX ENVIADO JOAO S SILVA', amount: -50 }))?.forma).toBe('pix');
    expect(lerTransacao('BANK', t({ description: 'COMPRA NO DEBITO PADARIA', amount: -8.5 }))).toMatchObject({ forma: 'debito', tipo: 'despesa', valor: 850 });
    expect(lerTransacao('BANK', t({ description: 'SALARIO ACME', amount: 8500, type: 'CREDIT', category: 'Salary' }))).toMatchObject({
      tipo: 'receita',
      valor: 850000,
      categoriaPluggy: 'Salary',
    });
  });

  test('cartão: valor positivo é compra; parcelada vem só a 1ª, com o número de parcelas', () => {
    const compra = t({
      description: 'PAG*ATACADAO 1234',
      amount: 187.4,
      type: 'DEBIT',
      creditCardMetadata: { installmentNumber: 1, totalInstallments: 3, purchaseDate: '2026-11-15T00:00:00.000Z' },
    });
    expect(lerTransacao('CREDIT', compra)).toMatchObject({
      conta: 'cartao',
      tipo: 'despesa',
      forma: 'credito',
      valor: 18740,
      parcelas: 3,
      data: '2026-11-15T12:00:00-03:00',
      estabelecimento: 'PAG*ATACADAO',
    });
    // As parcelas seguintes já entram quando a 1ª é lançada.
    expect(lerTransacao('CREDIT', { ...compra, creditCardMetadata: { installmentNumber: 2, totalInstallments: 3 } })).toBeNull();
    // Pagamento da fatura e estorno (negativos no cartão) ficam de fora.
    expect(lerTransacao('CREDIT', t({ description: 'PAGAMENTO RECEBIDO', amount: -500, type: 'CREDIT' }))).toBeNull();
    // A Pluggy normaliza o cartão: compra é sempre DEBIT, seja qual for o sinal do valor.
    expect(lerTransacao('CREDIT', t({ description: 'LOJA X', amount: -59.9, type: 'DEBIT' }))).toMatchObject({ forma: 'credito', valor: 5990 });
    expect(lerTransacao('CREDIT', t({ description: 'ESTORNO LOJA X', amount: 59.9, type: 'CREDIT' }))).toBeNull();
    expect(lerTransacao('CREDIT', t({ description: 'CASHBACK', amount: -3, type: 'DEBIT', operationType: 'CASHBACK' }))).toBeNull();
  });

  test('fica de fora o que já está no app de outro jeito: fatura, transferência para si mesmo e investimento', () => {
    expect(lerTransacao('BANK', t({ description: 'PAGAMENTO FATURA C6', amount: -1234.56, operationType: 'PAGAMENTO_FATURA' }))).toBeNull();
    expect(lerTransacao('BANK', t({ description: 'PGTO FATURA CARTAO', amount: -100 }))).toBeNull();
    expect(lerTransacao('BANK', t({ description: 'X', amount: -100, category: 'Credit card payment' }))).toBeNull();
    expect(lerTransacao('BANK', t({ description: 'PIX ENVIADO IAGO', amount: -100, category: 'Same person transfer - PIX' }))).toBeNull();
    expect(lerTransacao('BANK', t({ description: 'CDB C6', amount: -100, category: 'Fixed Income Investment' }))).toBeNull();
    expect(lerTransacao('BANK', t({ description: 'X', amount: 0 }))).toBeNull();
  });

  test('motivo de ficar de fora (para o diagnóstico da busca), sem descrição nem valor', () => {
    expect(motivoDeFora('BANK', t({ description: 'UBER *TRIP', amount: -23.7 }))).toBeNull();
    expect(motivoDeFora('BANK', t({ description: 'X', amount: 0 }))).toBe('sem valor');
    expect(motivoDeFora('BANK', t({ description: '', amount: -5 }))).toBe('sem descrição');
    expect(motivoDeFora('BANK', t({ description: 'X', amount: -100, operationType: 'PAGAMENTO_FATURA' }))).toBe('pagamento de fatura');
    expect(motivoDeFora('BANK', t({ description: 'PGTO FATURA CARTAO', amount: -100 }))).toBe('pagamento de fatura');
    expect(motivoDeFora('BANK', t({ description: 'CDB C6', amount: -100, category: 'Fixed Income Investment' }))).toBe('categoria: Fixed Income Investment');
    expect(motivoDeFora('CREDIT', t({ description: 'PAGAMENTO RECEBIDO', amount: -500, type: 'CREDIT' }))).toBe('cartão: não é compra');
    expect(motivoDeFora('CREDIT', t({ description: 'LOJA', amount: 10, type: 'DEBIT', creditCardMetadata: { installmentNumber: 2, totalInstallments: 3 } }))).toBe(
      'cartão: parcela seguinte',
    );
  });

  test('estabelecimento: a descrição em maiúsculas, sem acento e sem números (a chave da categoria aprendida)', () => {
    expect(estabelecimentoDe('Pag*Atacadão  1234')).toBe('PAG*ATACADAO');
    expect(estabelecimentoDe('UBER *TRIP 17/11')).toBe('UBER *TRIP');
    expect(estabelecimentoDe('IFD*IFOOD.COM AGENCIA DE')).toBe('IFD*IFOOD.COM AGENCIA DE');
  });

  test('"com o quê" sugerido: o nome do estabelecimento, se a Pluggy souber; senão a descrição limpa', () => {
    expect(nomeDe(t({ description: 'IFD*IFOOD.COM', merchant: { name: 'IFOOD' } }))).toBe('Ifood');
    expect(nomeDe(t({ description: 'PAG*ATACADAO 1234' }))).toBe('Atacadao');
    expect(nomeDe(t({ description: 'PIX ENVIADO JOAO S SILVA' }))).toBe('Joao S Silva');
    expect(nomeDe(t({ description: 'COMPRA NO DEBITO PADARIA REAL' }))).toBe('Padaria Real');
  });
});

test.describe('Open Finance: conferir com o que já foi lançado', () => {
  const doBanco = { tipo: 'despesa' as const, forma: 'debito' as const, valor: 3290, parcelas: 1, data: '2026-11-17T12:00:00-03:00' };
  const c = (extra: Partial<Candidato>): Candidato => ({
    id: 'x',
    tipo: 'despesa',
    forma: 'debito',
    valor: 3290,
    data: '2026-11-17T10:32:00-03:00',
    parcela: null,
    parcelas: null,
    recorrente: false,
    mes: '2026-11',
    ...extra,
  });

  test('bate: mesmo valor, mesma conta (débito e Pix valem igual) e até 3 dias de diferença; o mais perto ganha', () => {
    expect(acharPar(doBanco, [c({ id: 'a' })])).toBe('a');
    expect(acharPar(doBanco, [c({ id: 'a', forma: 'pix' })])).toBe('a');
    expect(acharPar(doBanco, [c({ id: 'a', data: '2026-11-14T20:00:00-03:00' })])).toBe('a');
    expect(acharPar(doBanco, [c({ id: 'a', data: '2026-11-13T20:00:00-03:00' })])).toBeNull();
    expect(acharPar(doBanco, [c({ id: 'longe', data: '2026-11-15T09:00:00-03:00' }), c({ id: 'perto', data: '2026-11-16T09:00:00-03:00' })])).toBe('perto');
  });

  test('não bate: outro valor, crédito, VR ou receita', () => {
    expect(acharPar(doBanco, [c({ valor: 3291 })])).toBeNull();
    expect(acharPar(doBanco, [c({ forma: 'credito', parcela: 1, parcelas: 1 })])).toBeNull();
    expect(acharPar(doBanco, [c({ forma: 'vr' })])).toBeNull();
    expect(acharPar(doBanco, [c({ tipo: 'receita', forma: null })])).toBeNull();
  });

  test('cartão: bate com a 1ª parcela da compra no mesmo número de vezes', () => {
    const credito = { tipo: 'despesa' as const, forma: 'credito' as const, valor: 40000, parcelas: 3, data: '2026-11-17T12:00:00-03:00' };
    const parcela1 = c({ id: 'p1', forma: 'credito', valor: 40000, parcela: 1, parcelas: 3 });
    expect(acharPar(credito, [c({ id: 'p2', forma: 'credito', valor: 40000, parcela: 2, parcelas: 3 }), parcela1])).toBe('p1');
    expect(acharPar(credito, [c({ forma: 'credito', valor: 40000, parcela: 1, parcelas: 2 })])).toBeNull();
    // A divisão põe o resto na 1ª parcela (R$ 100,00 em 3x: 33,34 + 33,33 + 33,33).
    expect(acharPar({ ...credito, valor: 3333 }, [c({ id: 'r', forma: 'credito', valor: 3334, parcela: 1, parcelas: 3 })])).toBe('r');
    expect(acharPar({ ...credito, valor: 3290, parcelas: 1 }, [c({ id: 'd' })])).toBeNull();
  });

  test('assinatura (todo mês): bate com a do mês, seja qual for o dia em que foi criada', () => {
    const netflix = { tipo: 'despesa' as const, forma: 'credito' as const, valor: 5590, parcelas: 1, data: '2026-11-17T12:00:00-03:00' };
    const assinatura = (mes: string) => c({ id: mes, forma: 'credito', valor: 5590, parcela: 4, parcelas: null, recorrente: true, data: '2026-08-02T10:00:00-03:00', mes });
    expect(acharPar(netflix, [assinatura('2026-10'), assinatura('2026-12')])).toBe('2026-12');
    expect(acharPar(netflix, [assinatura('2027-02')])).toBeNull();
  });

  test('receita bate com receita do mesmo valor', () => {
    const salario = { tipo: 'receita' as const, forma: 'debito' as const, valor: 850000, parcelas: 1, data: '2026-11-05T12:00:00-03:00' };
    expect(acharPar(salario, [c({ id: 's', tipo: 'receita', forma: null, valor: 850000, data: '2026-11-05T09:00:00-03:00' })])).toBe('s');
  });
});

test.describe('Open Finance: categoria sugerida e o lançamento criado', () => {
  const despesas = ['Moradia', 'Mercado', 'Transporte', 'Alimentação', 'Lazer', 'Saúde', 'Outros'];

  test('a categoria da Pluggy vira a do app; sem par, Outros; receita só sugere Salário', () => {
    expect(categoriaSugerida('Groceries', 'despesa', despesas)).toBe('Mercado');
    expect(categoriaSugerida('Taxi and ride-hailing', 'despesa', despesas)).toBe('Transporte');
    expect(categoriaSugerida('Gas stations', 'despesa', despesas)).toBe('Transporte');
    expect(categoriaSugerida('Eating out', 'despesa', despesas)).toBe('Alimentação');
    expect(categoriaSugerida('Food delivery', 'despesa', ['Comer fora', 'Outros'])).toBe('Comer fora');
    expect(categoriaSugerida('Pharmacy', 'despesa', despesas)).toBe('Saúde');
    expect(categoriaSugerida('Electricity', 'despesa', despesas)).toBe('Moradia');
    expect(categoriaSugerida('Video streaming', 'despesa', despesas)).toBe('Lazer');
    expect(categoriaSugerida('Transfers', 'despesa', despesas)).toBe('Outros');
    expect(categoriaSugerida(null, 'despesa', despesas)).toBe('Outros');
    expect(categoriaSugerida('Salary', 'receita', ['Salário', 'Renda extra'])).toBe('Salário');
    expect(categoriaSugerida('Transfers', 'receita', ['Salário', 'Renda extra'])).toBeNull();
  });

  test('cartão do app: o de nome parecido com o do banco; senão o primeiro', () => {
    const cartoes = [
      { id: 'nu', nome: 'Nubank', diaFechamento: 1 },
      { id: 'c6', nome: 'C6bank', diaFechamento: 4 },
    ];
    expect(escolherCartao(cartoes, 'C6 Bank Mastercard Black')?.id).toBe('c6');
    expect(escolherCartao(cartoes, 'Cartão de crédito')?.id).toBe('nu');
    expect(escolherCartao([], 'C6')).toBeNull();
  });

  test('lançar do banco: débito vira um lançamento; crédito parcelado vira as parcelas nas faturas certas', () => {
    const base = { userId: 'u', categoriaId: 'cat', descricao: 'Uber', compraId: 'compra' };
    expect(
      linhasDoLancamento({ tipo: 'despesa', forma: 'pix', valor: 2370, parcelas: 1, data: '2026-11-17T12:00:00-03:00' }, { ...base, cartao: null }),
    ).toEqual([
      { user_id: 'u', tipo: 'despesa', valor: 2370, categoria_id: 'cat', descricao: 'Uber', data: '2026-11-17T12:00:00-03:00', origem: 'banco', forma_pagamento: 'pix' },
    ]);
    expect(
      linhasDoLancamento({ tipo: 'receita', forma: 'debito', valor: 850000, parcelas: 1, data: '2026-11-05T12:00:00-03:00' }, { ...base, cartao: null })[0],
    ).toMatchObject({ tipo: 'receita', forma_pagamento: null });
    // Fecha dia 4: compra em 15/nov cai na fatura de dezembro.
    const parcelas = linhasDoLancamento(
      { tipo: 'despesa', forma: 'credito', valor: 18740, parcelas: 3, data: '2026-11-15T12:00:00-03:00' },
      { ...base, cartao: { id: 'c6', diaFechamento: 4 } },
    );
    expect(parcelas.map((p) => [p.valor, p.parcela, p.parcelas, p.competencia, p.cartao_id, p.compra_id])).toEqual([
      [18740, 1, 3, '2026-12', 'c6', 'compra'],
      [18740, 2, 3, '2027-01', 'c6', 'compra'],
      [18740, 3, 3, '2027-02', 'c6', 'compra'],
    ]);
    expect(() =>
      linhasDoLancamento({ tipo: 'despesa', forma: 'credito', valor: 100, parcelas: 1, data: '2026-11-15T12:00:00-03:00' }, { ...base, cartao: null }),
    ).toThrow('Cadastre o cartão em Ajustes');
  });
});
