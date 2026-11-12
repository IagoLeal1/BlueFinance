import { test, expect, tokenDe, clienteDe, semearCartao, semearLancamentos, semearVr } from './fixtures';

test.describe('Atalho: VR', () => {
  test('VR aparece em "Como pagou?" depois do Pix, e primeiro quando foi o último usado na categoria', async ({ request, usuario }) => {
    const token = await tokenDe(request, usuario);
    await semearCartao(usuario, 'C6bank', 4);
    await semearVr(usuario, { valorMensal: 90000, dia: 5, saldo: 41230 });
    await semearLancamentos(usuario, [{ valor: 3290, categoria: 'Alimentação', descricao: 'Almoço', forma: 'vr' }]);
    const formas = async (categoria: string) => {
      const res = await request.get(`/api/quick-add/formas?categoria=${encodeURIComponent(categoria)}`, { headers: { Authorization: `Bearer ${token}` } });
      expect(res.status()).toBe(200);
      return (await res.json()).formas;
    };

    expect(await formas('Mercado')).toEqual(['Débito', 'Pix', 'VR', 'Crédito · C6bank']);
    expect(await formas('Alimentação')).toEqual(['VR', 'Débito', 'Pix', 'Crédito · C6bank']);
  });

  test('sem VR configurado, a lista fica como antes', async ({ request, usuario }) => {
    const token = await tokenDe(request, usuario);
    const res = await request.get('/api/quick-add/formas', { headers: { Authorization: `Bearer ${token}` } });
    expect((await res.json()).formas).toEqual(['Débito', 'Pix']);
  });

  test('lança no VR pelo Atalho: sai do VR e a notificação diz quanto sobra', async ({ request, usuario }) => {
    const token = await tokenDe(request, usuario);
    await semearVr(usuario, { valorMensal: 90000, dia: 5, saldo: 41230 });

    // No VR não tem parcelas: um "Em quantas vezes?" que venha preenchido é ignorado.
    const res = await request.post('/api/quick-add', {
      headers: { Authorization: `Bearer ${token}` },
      data: { categoria: 'Alimentação', valor: 32.9, descricao: 'Almoço', forma: 'VR', parcelas: '3' },
    });

    expect(res.status()).toBe(201);
    expect((await res.json()).mensagem).toBe('Gasto salvo: Alimentação · − R$ 32,90 no VR (sobram R$ 379,40)');
    const { data } = await clienteDe(usuario)
      .from('lancamentos')
      .select('tipo, valor, descricao, forma_pagamento, origem, parcelas')
      .eq('descricao', 'Almoço');
    expect(data).toEqual([{ tipo: 'despesa', valor: 3290, descricao: 'Almoço', forma_pagamento: 'vr', origem: 'atalho', parcelas: null }]);
  });

  test('VR sem VR configurado é recusado', async ({ request, usuario }) => {
    const token = await tokenDe(request, usuario);
    const res = await request.post('/api/quick-add', {
      headers: { Authorization: `Bearer ${token}` },
      data: { categoria: 'Alimentação', valor: 32.9, forma: 'VR' },
    });
    expect(res.status()).toBe(422);
    expect((await res.json()).mensagem).toBe('Forma de pagamento não encontrada. Atualize a lista no Atalho.');
  });
});
