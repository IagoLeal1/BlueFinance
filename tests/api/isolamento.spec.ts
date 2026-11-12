import { test, expect, tokenDe, clienteDe, semearVr } from './fixtures';

test.describe('isolamento entre usuários', () => {
  test('um usuário não enxerga nem altera os dados de outro', async ({ request, usuario, outroUsuario }) => {
    const token = await tokenDe(request, usuario);
    await request.post('/api/quick-add', {
      headers: { Authorization: `Bearer ${token}` },
      data: { categoria: 'Mercado', descricao: 'Só meu', valor_centavos: 3290 },
    });
    const intruso = clienteDe(outroUsuario);
    await clienteDe(usuario).from('cartoes').insert({ user_id: usuario.id, nome: 'Meu cartão', dia_fechamento: 3 });
    await semearVr(usuario, { valorMensal: 90000, dia: 5 });

    // Não lê lançamentos nem categorias do outro, nem tokens de ninguém.
    expect((await intruso.from('lancamentos').select('descricao')).data).toEqual([]);
    const categorias = (await intruso.from('categorias').select('user_id')).data ?? [];
    expect(categorias.every((c) => c.user_id === outroUsuario.id)).toBe(true);
    expect((await intruso.from('tokens_pessoais').select('id')).data).toEqual([]);
    expect((await intruso.from('cartoes').select('id')).data).toEqual([]);
    expect((await intruso.from('vr').select('user_id')).data).toEqual([]);
    // Nem configura o VR em nome do outro.
    expect((await intruso.from('vr').insert({ user_id: usuario.id, valor_mensal: 1, dia: 1 })).error).not.toBeNull();

    // Não cria lançamento em nome do outro.
    const invasao = await intruso.from('lancamentos').insert({ user_id: usuario.id, tipo: 'despesa', valor: 1 });
    expect(invasao.error).not.toBeNull();

    // Não apaga nem altera o lançamento do outro (a operação não atinge nenhuma linha).
    await intruso.from('lancamentos').delete().eq('descricao', 'Só meu');
    await intruso.from('lancamentos').update({ valor: 1 }).eq('descricao', 'Só meu');
    expect((await clienteDe(usuario).from('lancamentos').select('descricao, valor')).data).toEqual([
      { descricao: 'Só meu', valor: 3290 },
    ]);
  });
});
