import { test, expect, clienteDe } from './fixtures';

test.describe('aportes', () => {
  test('aporte soma no investimento; editar ajusta a diferença; excluir estorna', async ({ usuario }) => {
    const db = clienteDe(usuario);
    const valorAtual = async () => (await db.from('investimentos').select('valor_atual').single()).data?.valor_atual;
    const aportado = async () => (await db.from('investimentos').select('aportado').single()).data?.aportado;

    const { data: inv } = await db
      .from('investimentos')
      .insert({ user_id: usuario.id, nome: 'Tesouro Selic', tipo: 'Renda fixa', instituicao: 'XP', valor_atual: 100000, aportado: 100000 })
      .select('id')
      .single();

    const { data: aporte } = await db.rpc('registrar_aporte', { p_investimento: inv!.id, p_valor: 50000, p_descricao: '' });
    expect(await valorAtual()).toBe(150000); // R$ 1.000 + R$ 500
    expect(await aportado()).toBe(150000); // o valor inicial conta como aportado

    await db.rpc('editar_lancamento', { p_id: aporte!, p_valor: 30000, p_descricao: 'Aporte corrigido' });
    expect(await valorAtual()).toBe(130000); // aporte passou de R$ 500 para R$ 300
    expect(await aportado()).toBe(130000);

    await db.rpc('excluir_lancamento', { p_id: aporte! });
    expect(await valorAtual()).toBe(100000); // volta ao valor de antes do aporte
    expect(await aportado()).toBe(100000);
    expect((await db.from('lancamentos').select('id')).data).toEqual([]);
  });
});
