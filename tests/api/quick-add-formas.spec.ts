import { test, expect, tokenDe, clienteDe, semearCartao, semearLancamentos } from './fixtures';
import { mesAtual, nomeDoMes } from '../../src/domain/datas';
import { mesDaFatura } from '../../src/domain/parcelas';

test.describe('Atalho: como pagou', () => {
  test('lista as formas de pagamento, com a última usada na categoria primeiro', async ({ request, usuario }) => {
    const token = await tokenDe(request, usuario);
    await semearCartao(usuario, 'Nubank', 3);
    await semearCartao(usuario, 'Itaú', 25);
    await semearLancamentos(usuario, [
      { valor: 500, categoria: 'Transporte', descricao: 'Ônibus', forma: 'pix', data: '2026-10-01T12:00:00-03:00' },
      { valor: 1840, categoria: 'Transporte', descricao: 'Uber', data: '2026-10-02T12:00:00-03:00', credito: { cartao: 'Itaú', parcela: 1, parcelas: 1, competencia: '2026-10' } },
      { valor: 4100, categoria: 'Alimentação', descricao: 'Almoço', forma: 'pix' },
    ]);
    const formas = async (categoria?: string) => {
      const url = categoria ? `/api/quick-add/formas?categoria=${encodeURIComponent(categoria)}` : '/api/quick-add/formas';
      const res = await request.get(url, { headers: { Authorization: `Bearer ${token}` } });
      expect(res.status()).toBe(200);
      return (await res.json()).formas;
    };

    expect(await formas('Transporte')).toEqual(['Crédito · Itaú', 'Débito', 'Pix', 'Crédito · Nubank']);
    expect(await formas('Alimentação')).toEqual(['Pix', 'Débito', 'Crédito · Nubank', 'Crédito · Itaú']);
    // Categoria sem histórico (ou sem categoria): Débito, Pix e os cartões na ordem de cadastro.
    expect(await formas('Mercado')).toEqual(['Débito', 'Pix', 'Crédito · Nubank', 'Crédito · Itaú']);
    expect(await formas()).toEqual(['Débito', 'Pix', 'Crédito · Nubank', 'Crédito · Itaú']);
  });

  test('a lista de formas pede o token pessoal', async ({ request }) => {
    const res = await request.get('/api/quick-add/formas', { headers: { Authorization: 'Bearer bf_inexistente' } });
    expect(res.status()).toBe(401);
  });

  test('lança no crédito pelo Atalho: à vista, na fatura do cartão', async ({ request, usuario }) => {
    const token = await tokenDe(request, usuario);
    await semearCartao(usuario, 'Nubank', 3);
    const fatura = mesDaFatura(new Date().toISOString(), 3);

    const res = await request.post('/api/quick-add', {
      headers: { Authorization: `Bearer ${token}` },
      data: { categoria: 'Transporte', valor: 18.4, descricao: 'Uber', forma: 'Crédito · Nubank' },
    });

    expect(res.status()).toBe(201);
    expect((await res.json()).mensagem).toBe(`Gasto salvo: Transporte · − R$ 18,40 no crédito (Nubank, fatura de ${nomeDoMes(fatura)})`);
    const { data } = await clienteDe(usuario)
      .from('lancamentos')
      .select('valor, descricao, forma_pagamento, parcela, parcelas, competencia, origem, cartoes(nome)');
    expect(data).toEqual([
      { valor: 1840, descricao: 'Uber', forma_pagamento: 'credito', parcela: 1, parcelas: 1, competencia: fatura, origem: 'atalho', cartoes: { nome: 'Nubank' } },
    ]);
  });

  test('Pix e Débito pelo Atalho; sem forma continua Débito; forma desconhecida é recusada', async ({ request, usuario }) => {
    const token = await tokenDe(request, usuario);
    const lancar = (descricao: string, forma?: string) =>
      request.post('/api/quick-add', {
        headers: { Authorization: `Bearer ${token}` },
        data: { categoria: 'Alimentação', valor: 41, descricao, ...(forma !== undefined && { forma }) },
      });

    expect((await lancar('Almoço', 'Pix')).status()).toBe(201);
    expect((await lancar('Café', 'Débito')).status()).toBe(201);
    expect((await lancar('Lanche')).status()).toBe(201);
    for (const forma of ['Crédito · Inexistente', 'Cheque']) {
      const res = await lancar('Recusado', forma);
      expect(res.status(), forma).toBe(422);
      expect(await res.json()).toEqual({
        erro: 'Forma de pagamento não encontrada. Atualize a lista no Atalho.',
        mensagem: 'Forma de pagamento não encontrada. Atualize a lista no Atalho.',
      });
    }

    const { data } = await clienteDe(usuario).from('lancamentos').select('descricao, forma_pagamento, competencia').order('descricao');
    expect(data).toEqual([
      { descricao: 'Almoço', forma_pagamento: 'pix', competencia: mesAtual() },
      { descricao: 'Café', forma_pagamento: 'debito', competencia: mesAtual() },
      { descricao: 'Lanche', forma_pagamento: 'debito', competencia: mesAtual() },
    ]);
  });
});
