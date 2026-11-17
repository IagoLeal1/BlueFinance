import { test, expect, tokenDe, clienteDe, semearCartao, semearLancamentos, semearVr } from './fixtures';
import { mesAtual, somarMeses } from '../../src/domain/datas';
import { faturasDoCartao } from '../../src/domain/parcelas';
import { proximoDeposito } from '../../src/domain/vr';

/** O que o app do iPhone (Gasto rápido, Dynamic Island e widgets) usa da API, com o token pessoal. */
test.describe('API do app do iPhone', () => {
  test('categorias vêm também com o ícone, na ordem do app', async ({ request, usuario }) => {
    const token = await tokenDe(request, usuario);
    const res = await request.get('/api/quick-add/categorias', { headers: { Authorization: `Bearer ${token}` } });
    const corpo = await res.json();
    expect(corpo.categorias.slice(0, 3)).toEqual(['Moradia', 'Mercado', 'Transporte']);
    expect(corpo.itens.slice(0, 3)).toEqual([
      { nome: 'Moradia', icone: 'house', ordem: 1 },
      { nome: 'Mercado', icone: 'shopping-cart', ordem: 2 },
      { nome: 'Transporte', icone: 'car', ordem: 3 },
    ]);
    expect(corpo.itens.map((c: { nome: string }) => c.nome)).toEqual(corpo.categorias);
  });

  test('o gasto salvo pode ser desfeito pelo app; no VR vem o saldo que sobra', async ({ request, usuario }) => {
    const token = await tokenDe(request, usuario);
    await semearVr(usuario, { valorMensal: 90000, dia: 5, saldo: 41230 });
    const res = await request.post('/api/quick-add', {
      headers: { Authorization: `Bearer ${token}` },
      data: { categoria: 'Alimentação', valor: 32.9, descricao: 'Almoço', forma: 'VR' },
    });
    const corpo = await res.json();
    expect(corpo.vr).toEqual({ saldo: 37940 });
    expect(typeof corpo.desfazer).toBe('string');

    const desfeito = await request.post('/api/quick-add/desfazer', { headers: { Authorization: `Bearer ${token}` }, data: { desfazer: corpo.desfazer } });
    expect(desfeito.status()).toBe(200);
    expect((await desfeito.json()).mensagem).toBe('Lançamento desfeito.');
    const { data } = await clienteDe(usuario).from('lancamentos').select('id').eq('descricao', 'Almoço');
    expect(data).toEqual([]);
  });

  test('desfazer uma compra parcelada apaga todas as parcelas', async ({ request, usuario }) => {
    const token = await tokenDe(request, usuario);
    await semearCartao(usuario, 'C6bank', 4, 11);
    const res = await request.post('/api/quick-add', {
      headers: { Authorization: `Bearer ${token}` },
      data: { categoria: 'Lazer', valor: 1200, descricao: 'Fone', forma: 'Crédito · C6bank', parcelas: '3' },
    });
    const { desfazer } = await res.json();
    await request.post('/api/quick-add/desfazer', { headers: { Authorization: `Bearer ${token}` }, data: { desfazer } });
    const { data } = await clienteDe(usuario).from('lancamentos').select('id').eq('descricao', 'Fone');
    expect(data).toEqual([]);
  });

  test('desfazer só vale para o que veio do Atalho ou do app, e só do dono do token', async ({ request, usuario, outroUsuario }) => {
    const token = await tokenDe(request, usuario);
    const tokenDoOutro = await tokenDe(request, outroUsuario);
    await semearLancamentos(usuario, [{ valor: 160000, categoria: 'Moradia', descricao: 'Aluguel' }]);
    const { data: aluguel } = await clienteDe(usuario).from('lancamentos').select('id').eq('descricao', 'Aluguel').single();
    const res = await request.post('/api/quick-add', {
      headers: { Authorization: `Bearer ${token}` },
      data: { categoria: 'Mercado', valor: 10, descricao: 'Pão' },
    });
    const { desfazer } = await res.json();

    const doOutro = await request.post('/api/quick-add/desfazer', { headers: { Authorization: `Bearer ${tokenDoOutro}` }, data: { desfazer } });
    expect(doOutro.status()).toBe(404);
    const lancadoNoSite = await request.post('/api/quick-add/desfazer', { headers: { Authorization: `Bearer ${token}` }, data: { desfazer: aluguel!.id } });
    expect(lancadoNoSite.status()).toBe(404);
    const semToken = await request.post('/api/quick-add/desfazer', { data: { desfazer } });
    expect(semToken.status()).toBe(401);
    const { data } = await clienteDe(usuario).from('lancamentos').select('descricao').order('descricao');
    expect(data).toEqual([{ descricao: 'Aluguel' }, { descricao: 'Pão' }]);
  });

  test('reenviar o mesmo gasto (a rede caiu antes da resposta) não duplica', async ({ request, usuario }) => {
    const token = await tokenDe(request, usuario);
    await semearCartao(usuario, 'C6bank', 4, 11);
    const lancar = (id: string, extra: object) =>
      request.post('/api/quick-add', { headers: { Authorization: `Bearer ${token}` }, data: { id, categoria: 'Mercado', valor: 25, ...extra } });

    const id = crypto.randomUUID();
    const primeira = await lancar(id, { descricao: 'Pão' });
    const reenvio = await lancar(id, { descricao: 'Pão' });
    expect(primeira.status()).toBe(201);
    expect(reenvio.status()).toBe(201);
    expect((await reenvio.json()).desfazer).toBe(id);

    const compra = crypto.randomUUID();
    await lancar(compra, { descricao: 'Feira', forma: 'Crédito · C6bank', parcelas: '2' });
    await lancar(compra, { descricao: 'Feira', forma: 'Crédito · C6bank', parcelas: '2' });

    const { data } = await clienteDe(usuario).from('lancamentos').select('descricao').order('descricao');
    expect(data).toEqual([{ descricao: 'Feira' }, { descricao: 'Feira' }, { descricao: 'Pão' }]);
  });

  test('resumo para os widgets: o mês, a fatura a pagar e o VR', async ({ request, usuario }) => {
    const token = await tokenDe(request, usuario);
    const mes = mesAtual();
    await semearCartao(usuario, 'C6bank', 4, 11);
    await semearVr(usuario, { valorMensal: 90000, dia: 5, saldo: 41230 });
    const { aberta, fechada } = faturasDoCartao(new Date().toISOString(), 4, 11);
    await semearLancamentos(usuario, [
      { tipo: 'receita', valor: 850000, categoria: 'Salário', descricao: 'Salário' },
      { valor: 3290, categoria: 'Mercado', descricao: 'Pão', forma: 'pix' },
      { valor: 41840, categoria: 'Lazer', descricao: 'Show', credito: { cartao: 'C6bank', parcela: 1, parcelas: 1, competencia: fechada?.mes ?? aberta } },
    ]);

    const res = await request.get('/api/resumo', { headers: { Authorization: `Bearer ${token}` } });
    expect(res.status()).toBe(200);
    const corpo = await res.json();
    expect(corpo).toMatchObject({ mes, entrou: 850000 });
    expect(corpo.sobrou).toBe(corpo.entrou - corpo.saiu - corpo.investiu);
    expect(corpo.faturas).toEqual([
      fechada
        ? { cartao: 'C6bank', mes: fechada.mes, total: 41840, vence: fechada.vence }
        : { cartao: 'C6bank', mes: aberta, total: 41840, vence: `${aberta === mes ? mes : somarMeses(mes, 1)}-11` },
    ]);
    expect(corpo.vr).toEqual({ saldo: 41230, valorMensal: 90000, proximo: proximoDeposito(5) });

    const semToken = await request.get('/api/resumo');
    expect(semToken.status()).toBe(401);
  });
});
