import { test, expect, admin, clienteDe, semearCartao, semearLancamentos, type Usuario } from './fixtures';
import { diaAtras, montarPluggy, naPluggy, semearBanco } from '../support/pluggy';
import { mesDaFatura } from '../../src/domain/parcelas';
import type { APIRequestContext } from '@playwright/test';

/** A busca diária no banco (agendada na Vercel), com o segredo do agendamento. */
const buscar = (request: APIRequestContext) =>
  request.get('/api/banco', { headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` } });

const doBanco = async (usuario: Usuario) => {
  const { data, error } = await clienteDe(usuario)
    .from('transacoes_banco')
    .select('pluggy_id, situacao, lancamento_id, categorias(nome)')
    .order('pluggy_id');
  if (error) throw error;
  return data.map((t) => ({ id: t.pluggy_id, situacao: t.situacao, lancado: !!t.lancamento_id, sugestao: t.categorias?.nome ?? null }));
};

test.describe('Open Finance: a busca diária no banco', () => {
  test('sem o segredo do agendamento, não busca', async ({ request }) => {
    expect((await request.get('/api/banco')).status()).toBe(401);
    expect((await request.get('/api/banco', { headers: { Authorization: 'Bearer errado' } })).status()).toBe(401);
  });

  test('confere o que já foi lançado, deixa de fora fatura e parcela seguinte, e manda o resto para conferir', async ({ request, usuario }) => {
    const [hoje, ontem] = [diaAtras(0), diaAtras(1)];
    await semearCartao(usuario, 'C6bank', 4, 11);
    await semearLancamentos(usuario, [
      { valor: 3290, categoria: 'Alimentação', descricao: 'Almoço', data: `${hoje}T12:30:00-03:00` },
      ...[1, 2, 3].map((parcela) => ({
        valor: 40000,
        categoria: 'Lazer',
        descricao: 'Fone',
        data: `${hoje}T09:00:00-03:00`,
        credito: { cartao: 'C6bank', parcela, parcelas: 3, competencia: mesDaFatura(`${hoje}T09:00:00-03:00`, 4), compra: 'fone' },
      })),
    ]);
    const itemId = await montarPluggy(
      [
        {
          type: 'BANK',
          name: 'C6 Bank',
          transacoes: [
            { id: 't-almoco', description: 'COMPRA NO DEBITO RESTAURANTE', amount: -32.9, date: naPluggy(hoje) },
            { id: 't-uber', description: 'UBER *TRIP', amount: -23.7, date: naPluggy(ontem), paymentData: { paymentMethod: 'PIX' }, category: 'Taxi and ride-hailing' },
            { id: 't-fatura', description: 'PAGAMENTO FATURA', amount: -500, date: naPluggy(ontem), operationType: 'PAGAMENTO_FATURA' },
            { id: 't-antiga', description: 'MERCADO ANTIGO', amount: -10, date: naPluggy(diaAtras(5)) },
            { id: 't-salario', description: 'SALARIO ACME', amount: 8500, date: naPluggy(ontem), category: 'Salary' },
          ],
        },
        {
          type: 'CREDIT',
          name: 'C6 Bank Mastercard',
          transacoes: [
            { id: 't-fone', description: 'LOJA FONES', amount: 400, type: 'DEBIT', date: naPluggy(hoje), creditCardMetadata: { installmentNumber: 1, totalInstallments: 3 } },
            { id: 't-fone-2', description: 'LOJA FONES', amount: 400, type: 'DEBIT', date: naPluggy(hoje), creditCardMetadata: { installmentNumber: 2, totalInstallments: 3 } },
            { id: 't-pagamento', description: 'PAGAMENTO RECEBIDO', amount: -500, date: naPluggy(ontem) },
            { id: 't-mercado', description: 'PAG*ATACADAO 1234', amount: 187.4, type: 'DEBIT', date: naPluggy(hoje), category: 'Groceries' },
          ],
        },
      ],
      { lastUpdatedAt: '2026-11-17T10:12:00.000Z', consentExpiresAt: '2027-11-17T10:00:00.000Z' },
    );
    await semearBanco(usuario, itemId, diaAtras(2));

    const res = await buscar(request);
    expect(res.status()).toBe(200);
    const esperado = [
      { id: 't-almoco', situacao: 'conferido', lancado: true, sugestao: null },
      { id: 't-fone', situacao: 'conferido', lancado: true, sugestao: null },
      { id: 't-mercado', situacao: 'conferir', lancado: false, sugestao: 'Mercado' },
      { id: 't-salario', situacao: 'conferir', lancado: false, sugestao: 'Salário' },
      { id: 't-uber', situacao: 'conferir', lancado: false, sugestao: 'Transporte' },
    ];
    expect(await doBanco(usuario)).toEqual(esperado);

    // Buscar de novo não duplica nada.
    expect((await buscar(request)).status()).toBe(200);
    expect(await doBanco(usuario)).toEqual(esperado);
    const { data: lancamentos } = await clienteDe(usuario).from('lancamentos').select('id');
    expect(lancamentos).toHaveLength(4);

    const { data: banco } = await clienteDe(usuario).from('bancos').select('instituicao, contas, atualizado_em, autorizacao_ate, buscado_em, erro').single();
    expect(banco).toMatchObject({ instituicao: 'C6 Bank', contas: 'Conta e cartão', erro: null });
    expect(new Date(banco!.atualizado_em!).toISOString()).toBe('2026-11-17T10:12:00.000Z');
    expect(new Date(banco!.autorizacao_ate!).toISOString()).toBe('2027-11-17T10:00:00.000Z');
    expect(banco!.buscado_em).not.toBeNull();

    // Diagnóstico da busca: quanto a Pluggy mandou por conta (de `desde` em diante e na semana anterior) e quanto entrou.
    const { data: diagnostico } = await clienteDe(usuario).from('bancos').select('ultima_busca').single();
    expect(diagnostico!.ultima_busca).toEqual([
      { tipo: 'BANK', recebidas: 4, aproveitadas: 3, antes: 1, maisRecente: hoje, deFora: { 'pagamento de fatura': 1 } },
      { tipo: 'CREDIT', recebidas: 4, aproveitadas: 2, antes: 0, maisRecente: hoje, deFora: { 'cartão: parcela seguinte': 1, 'cartão: não é compra': 1 } },
    ]);
  });

  test('estabelecimento conhecido entra sozinho, na categoria e com o "com o quê" aprendidos', async ({ request, usuario }) => {
    const hoje = diaAtras(0);
    await semearCartao(usuario, 'C6bank', 4, 11);
    const db = clienteDe(usuario);
    const { data: mercado } = await db.from('categorias').select('id').eq('nome', 'Mercado').single();
    await db.from('regras_banco').insert({ user_id: usuario.id, tipo: 'despesa', estabelecimento: 'PAG*ATACADAO', categoria_id: mercado!.id, descricao: 'Atacadão' });
    const itemId = await montarPluggy([
      {
        type: 'CREDIT',
        name: 'C6 Bank Mastercard',
        transacoes: [{ id: 't-mercado', description: 'PAG*ATACADAO 5678', amount: 187.4, type: 'DEBIT', date: naPluggy(hoje), category: 'Groceries' }],
      },
    ]);
    await semearBanco(usuario, itemId, hoje);

    await buscar(request);
    await buscar(request);
    expect(await doBanco(usuario)).toEqual([{ id: 't-mercado', situacao: 'lancado', lancado: true, sugestao: null }]);
    const { data } = await db.from('lancamentos').select('descricao, valor, origem, forma_pagamento, competencia, categorias(nome), cartoes(nome)');
    expect(data).toEqual([
      {
        descricao: 'Atacadão',
        valor: 18740,
        origem: 'banco',
        forma_pagamento: 'credito',
        competencia: mesDaFatura(`${hoje}T12:00:00-03:00`, 4),
        categorias: { nome: 'Mercado' },
        cartoes: { nome: 'C6bank' },
      },
    ]);
  });

  test('o que estava para conferir é conferido quando você lança depois', async ({ request, usuario }) => {
    const ontem = diaAtras(1);
    const itemId = await montarPluggy([
      { type: 'BANK', name: 'C6 Bank', transacoes: [{ id: 't-uber', description: 'UBER *TRIP', amount: -23.7, date: naPluggy(ontem) }] },
    ]);
    await semearBanco(usuario, itemId, ontem);
    await buscar(request);
    expect((await doBanco(usuario))[0]!.situacao).toBe('conferir');

    await semearLancamentos(usuario, [{ valor: 2370, categoria: 'Transporte', descricao: 'Uber', forma: 'pix', data: `${ontem}T22:00:00-03:00` }]);
    await buscar(request);
    expect(await doBanco(usuario)).toEqual([{ id: 't-uber', situacao: 'conferido', lancado: true, sugestao: 'Outros' }]);
  });

  test('o que o banco confere ensina o lugar: a sua categoria e o seu nome (o que está a confirmar, não)', async ({ request, usuario }) => {
    const hoje = diaAtras(0);
    const db = clienteDe(usuario);
    await semearLancamentos(usuario, [{ valor: 3290, categoria: 'Alimentação', descricao: 'Almoço', data: `${hoje}T12:30:00-03:00` }]);
    const { data: outros } = await db.from('categorias').select('id').eq('nome', 'Outros').single();
    await db.from('lancamentos').insert({
      user_id: usuario.id, tipo: 'despesa', valor: 850, categoria_id: outros!.id, descricao: 'Padaria Real', data: `${hoje}T08:00:00-03:00`,
      forma_pagamento: 'debito', origem: 'applepay', a_confirmar: true, estabelecimento: 'PADARIA REAL',
    });
    const itemId = await montarPluggy([
      {
        type: 'BANK',
        name: 'C6 Bank',
        transacoes: [
          { id: 't-almoco', description: 'RESTAURANTE BOM PRATO', amount: -32.9, date: naPluggy(hoje) },
          { id: 't-padaria', description: 'PADARIA REAL LTDA', amount: -8.5, date: naPluggy(hoje) },
        ],
      },
    ]);
    await semearBanco(usuario, itemId, hoje);
    await buscar(request);

    expect((await doBanco(usuario)).map((t) => t.situacao)).toEqual(['conferido', 'conferido']);
    const { data: regras } = await db.from('regras_banco').select('estabelecimento, descricao, categorias(nome)');
    expect(regras).toEqual([{ estabelecimento: 'RESTAURANTE BOM PRATO', descricao: 'Almoço', categorias: { nome: 'Alimentação' } }]);
  });

  test('descrição genérica ("Débito de Cartão") não ensina nada nem entra sozinha', async ({ request, usuario, outroUsuario }) => {
    const hoje = diaAtras(0);
    const debitoDeCartao = (id: string, amount: number) => ({ id, description: 'Débito de Cartão', amount, date: naPluggy(hoje) });

    // Bate com um gasto seu: confere, mas "Débito de Cartão" não vira um lugar com a sua categoria.
    await semearLancamentos(usuario, [{ valor: 700, categoria: 'Alimentação', descricao: 'Coca cola', data: `${hoje}T12:30:00-03:00` }]);
    await semearBanco(usuario, await montarPluggy([{ type: 'BANK', name: 'C6 Bank', transacoes: [debitoDeCartao('t-coca', -7)] }]), hoje);

    // Uma regra aprendida por engano antes não faz a compra entrar sozinha: vai para conferir.
    const db = clienteDe(outroUsuario);
    const { data: alimentacao } = await db.from('categorias').select('id').eq('nome', 'Alimentação').single();
    await db.from('regras_banco').insert({ user_id: outroUsuario.id, tipo: 'despesa', estabelecimento: 'DEBITO DE CARTAO', categoria_id: alimentacao!.id, descricao: 'Coca cola' });
    await semearBanco(outroUsuario, await montarPluggy([{ type: 'BANK', name: 'C6 Bank', transacoes: [debitoDeCartao('t-outra', -9.9)] }]), hoje);

    await buscar(request);
    expect(await doBanco(usuario)).toEqual([{ id: 't-coca', situacao: 'conferido', lancado: true, sugestao: null }]);
    expect((await clienteDe(usuario).from('regras_banco').select('estabelecimento')).data).toEqual([]);
    expect(await doBanco(outroUsuario)).toEqual([{ id: 't-outra', situacao: 'conferir', lancado: false, sugestao: 'Outros' }]);
    expect((await db.from('lancamentos').select('id')).data).toEqual([]);
  });

  test('conexão que não existe mais na Pluggy: guarda o problema para mostrar em Ajustes', async ({ request, usuario }) => {
    await semearBanco(usuario, 'item-que-nao-existe', diaAtras(0));
    expect((await buscar(request)).status()).toBe(200);
    const { data } = await clienteDe(usuario).from('bancos').select('erro').single();
    expect(data!.erro).toBe('Não achei a conexão na Pluggy. Conecte de novo em Ajustes.');
  });

  test('cada um só vê o próprio banco, e só a busca grava transações', async ({ usuario, outroUsuario }) => {
    await semearBanco(usuario, 'item-qualquer', diaAtras(0));
    const { error: insercao } = await admin
      .from('transacoes_banco')
      .insert({ user_id: usuario.id, pluggy_id: 'x', conta: 'conta', tipo: 'despesa', forma: 'pix', valor: 100, data: new Date().toISOString(), descricao: 'X', estabelecimento: 'X' });
    expect(insercao).toBeNull();
    const outro = clienteDe(outroUsuario);
    expect((await outro.from('bancos').select('user_id')).data).toEqual([]);
    expect((await outro.from('transacoes_banco').select('id')).data).toEqual([]);
    const { error } = await clienteDe(usuario)
      .from('transacoes_banco')
      .insert({ user_id: usuario.id, pluggy_id: 'y', conta: 'conta', tipo: 'despesa', forma: 'pix', valor: 100, data: new Date().toISOString(), descricao: 'Y', estabelecimento: 'Y' });
    expect(error).not.toBeNull();
  });
});
