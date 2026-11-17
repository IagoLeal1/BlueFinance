import type { APIRequestContext } from '@playwright/test';
import { test, expect, tokenDe, clienteDe, semearCartao, semearVr, type Usuario } from './fixtures';
import { nomeDoMes } from '../../src/domain/datas';
import { formatSigned } from '../../src/domain/money';
import { mesDaFatura } from '../../src/domain/parcelas';

/** O que a automação "Carteira" do Atalhos manda ao encostar o iPhone: valor, lugar e cartão. */
const pagar = (request: APIRequestContext, token: string, data: object) =>
  request.post('/api/apple-pay', { headers: { Authorization: `Bearer ${token}` }, data });
const menos = (centavos: number) => formatSigned(centavos, 'despesa');

const lancamentos = async (usuario: Usuario) => {
  const { data, error } = await clienteDe(usuario)
    .from('lancamentos')
    .select('descricao, valor, origem, forma_pagamento, a_confirmar, estabelecimento, competencia, parcela, parcelas, categorias(nome), cartoes(nome)')
    .order('criado_em');
  if (error) throw error;
  return data;
};

test.describe('Apple Pay: a automação da Carteira', () => {
  test('sem token, não salva', async ({ request }) => {
    const res = await request.post('/api/apple-pay', { data: { valor: 10, lugar: 'X', cartao: 'C6' } });
    expect(res.status()).toBe(401);
  });

  test('lugar novo: entra na hora em Outros, a confirmar; o cartão aparece com a forma pelo nome', async ({ request, usuario }) => {
    const token = await tokenDe(request, usuario);
    const res = await pagar(request, token, { valor: 'R$ 8,50', lugar: 'Padaria Real', cartao: 'C6 Débito' });
    expect(res.status()).toBe(201);
    expect((await res.json()).mensagem).toBe(`Lugar novo: Padaria Real · ${menos(850)} em Outros. Confirme em Lançamentos.`);
    expect(await lancamentos(usuario)).toEqual([
      expect.objectContaining({
        descricao: 'Padaria Real',
        valor: 850,
        origem: 'applepay',
        forma_pagamento: 'debito',
        a_confirmar: true,
        estabelecimento: 'PADARIA REAL',
        categorias: { nome: 'Outros' },
      }),
    ]);
    const { data: cartoes } = await clienteDe(usuario).from('cartoes_carteira').select('nome, forma');
    expect(cartoes).toEqual([{ nome: 'C6 Débito', forma: 'debito' }]);
  });

  test('lugar conhecido: entra com a categoria e o nome que você já usou ali', async ({ request, usuario }) => {
    const token = await tokenDe(request, usuario);
    const db = clienteDe(usuario);
    const { data: mercado } = await db.from('categorias').select('id').eq('nome', 'Mercado').single();
    await db.from('regras_banco').insert({ user_id: usuario.id, tipo: 'despesa', estabelecimento: 'ATACADAO', categoria_id: mercado!.id, descricao: 'Atacadão' });

    const res = await pagar(request, token, { valor: 187.4, lugar: 'ATACADÃO', cartao: 'C6 Débito' });
    expect((await res.json()).mensagem).toBe(`Gasto salvo: Mercado · Atacadão · ${menos(18740)}`);
    expect(await lancamentos(usuario)).toEqual([expect.objectContaining({ descricao: 'Atacadão', a_confirmar: false, categorias: { nome: 'Mercado' } })]);
  });

  test('C6 Crédito cai na fatura do cartão; o VR diz quanto sobra', async ({ request, usuario }) => {
    const token = await tokenDe(request, usuario);
    await semearCartao(usuario, 'C6bank', 4, 11);
    await semearVr(usuario, { valorMensal: 90000, dia: 5, saldo: 41230 });
    const fatura = mesDaFatura(new Date().toISOString(), 4);

    const credito = await (await pagar(request, token, { valor: 64, lugar: 'Cinemark', cartao: 'C6 Crédito' })).json();
    expect(credito.mensagem).toBe(`Lugar novo: Cinemark · ${menos(6400)} em Outros, no crédito (C6bank, fatura de ${nomeDoMes(fatura)}). Confirme em Lançamentos.`);
    const vr = await (await pagar(request, token, { valor: 32.9, lugar: 'Bom Prato', cartao: 'VR Refeição' })).json();
    expect(vr.mensagem).toContain('no VR (sobram R$ 379,40)');

    expect((await lancamentos(usuario)).filter((l) => l.origem === 'applepay')).toEqual([
      expect.objectContaining({ descricao: 'Cinemark', forma_pagamento: 'credito', competencia: fatura, parcela: 1, parcelas: 1, cartoes: { nome: 'C6bank' } }),
      expect.objectContaining({ descricao: 'Bom Prato', forma_pagamento: 'vr' }),
    ]);
  });

  test('a forma escolhida em Ajustes manda: o mesmo cartão trocado para crédito', async ({ request, usuario }) => {
    const token = await tokenDe(request, usuario);
    await semearCartao(usuario, 'C6bank', 4, 11);
    const db = clienteDe(usuario);
    const { data: c6 } = await db.from('cartoes').select('id').single();
    await db.from('cartoes_carteira').insert({ user_id: usuario.id, nome: 'C6 Bank', forma: 'credito', cartao_id: c6!.id });
    await pagar(request, token, { valor: 10, lugar: 'Café', cartao: 'C6 Bank' });
    expect(await lancamentos(usuario)).toEqual([expect.objectContaining({ forma_pagamento: 'credito', cartoes: { nome: 'C6bank' } })]);
  });

  test('já lançado pelo Atalho: só confere, e o lugar aprende a sua categoria e o seu nome', async ({ request, usuario }) => {
    const token = await tokenDe(request, usuario);
    await request.post('/api/quick-add', {
      headers: { Authorization: `Bearer ${token}` },
      data: { categoria: 'Alimentação', valor: 32.9, descricao: 'Almoço' },
    });
    const res = await pagar(request, token, { valor: 'R$ 32,90', lugar: 'Bom Prato', cartao: 'C6 Débito' });
    expect(res.status()).toBe(200);
    expect((await res.json()).mensagem).toBe(`Já estava lançado: Alimentação · Almoço · ${menos(3290)}`);
    expect(await lancamentos(usuario)).toEqual([expect.objectContaining({ descricao: 'Almoço', origem: 'atalho', estabelecimento: 'BOM PRATO' })]);

    // Da próxima vez no mesmo lugar, entra sozinho do seu jeito.
    const depois = await pagar(request, token, { valor: 40, lugar: 'Bom Prato', cartao: 'C6 Débito' });
    expect((await depois.json()).mensagem).toBe(`Gasto salvo: Alimentação · Almoço · ${menos(4000)}`);
  });

  test('a automação rodou duas vezes para o mesmo pagamento: não duplica', async ({ request, usuario }) => {
    const token = await tokenDe(request, usuario);
    await pagar(request, token, { valor: 8.5, lugar: 'Padaria Real', cartao: 'C6 Débito' });
    const segunda = await pagar(request, token, { valor: 8.5, lugar: 'Padaria Real', cartao: 'C6 Débito' });
    expect(segunda.status()).toBe(200);
    expect(await lancamentos(usuario)).toHaveLength(1);
  });

  test('valor que não dá para ler: avisa', async ({ request, usuario }) => {
    const token = await tokenDe(request, usuario);
    const res = await pagar(request, token, { valor: 'abc', lugar: 'X', cartao: 'C6' });
    expect(res.status()).toBe(400);
    expect((await res.json()).mensagem).toBe('Não achei o valor do pagamento.');
  });

  test('cada um só vê os próprios cartões da Carteira', async ({ request, usuario, outroUsuario }) => {
    const token = await tokenDe(request, usuario);
    await pagar(request, token, { valor: 8.5, lugar: 'Padaria Real', cartao: 'C6 Débito' });
    expect((await clienteDe(outroUsuario).from('cartoes_carteira').select('nome')).data).toEqual([]);
    expect((await clienteDe(outroUsuario).from('lancamentos').select('id')).data).toEqual([]);
  });
});
