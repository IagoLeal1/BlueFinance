import { test, expect, tokenDe, clienteDe } from './fixtures';

test.describe('lançamento rápido (Atalho do iOS)', () => {
  test('lista as categorias de despesa para o Atalho escolher', async ({ request, usuario }) => {
    const token = await tokenDe(request, usuario);

    const res = await request.get('/api/quick-add/categorias', { headers: { Authorization: `Bearer ${token}` } });

    expect(res.status()).toBe(200);
    expect(await res.json()).toEqual({
      categorias: ['Moradia', 'Mercado', 'Transporte', 'Alimentação', 'Lazer', 'Saúde', 'Outros'],
    });
  });

  test('cria um gasto com token válido e devolve a confirmação', async ({ request, usuario }) => {
    const token = await tokenDe(request, usuario);

    const res = await request.post('/api/quick-add', {
      headers: { Authorization: `Bearer ${token}` },
      data: { categoria: 'Mercado', descricao: 'Mercado do bairro', valor_centavos: 3290 },
    });

    expect(res.status()).toBe(201);
    const body = await res.json();
    // O Atalho mostra sempre o campo "mensagem": no sucesso e nos erros.
    expect(body.mensagem).toBe('Gasto salvo: Mercado · \u2212 R$ 32,90');
    expect(body.lancamento).toMatchObject({ tipo: 'despesa', categoria: 'Mercado', descricao: 'Mercado do bairro', valor: 3290 });

    // O gasto aparece para o dono, pelo mesmo acesso que o app usa.
    const { data } = await clienteDe(usuario).from('lancamentos').select('descricao, valor, tipo');
    expect(data).toEqual([{ descricao: 'Mercado do bairro', valor: 3290, tipo: 'despesa' }]);
  });

  test('recusa sem token ou com token inválido e não cria nada', async ({ request, usuario }) => {
    const gasto = { categoria: 'Mercado', descricao: 'Mercado do bairro', valor_centavos: 3290 };
    // A sessão do app não serve no lugar do token pessoal.
    for (const auth of [undefined, 'Bearer bf_inexistente', 'Bearer ', `Bearer ${usuario.sessao}`]) {
      const res = await request.post('/api/quick-add', { headers: auth ? { Authorization: auth } : {}, data: gasto });
      expect(res.status(), String(auth)).toBe(401);
      expect(await res.json()).toEqual({ erro: 'Token inválido. Gere um novo em Ajustes.', mensagem: 'Token inválido. Gere um novo em Ajustes.' });
    }

    const { data } = await clienteDe(usuario).from('lancamentos').select('id');
    expect(data).toEqual([]);
  });

  test('recusa valor inválido com mensagem em português e não cria nada', async ({ request, usuario }) => {
    const token = await tokenDe(request, usuario);

    for (const valor of [0, -500, 32.9, '3290', 'abc', null, undefined]) {
      const res = await request.post('/api/quick-add', {
        headers: { Authorization: `Bearer ${token}` },
        data: { categoria: 'Mercado', descricao: 'Teste', valor_centavos: valor },
      });
      expect(res.status(), String(valor)).toBe(400);
      expect(await res.json()).toEqual({ erro: 'O valor precisa ser um número inteiro de centavos maior que zero.', mensagem: 'O valor precisa ser um número inteiro de centavos maior que zero.' });
    }

    const { data } = await clienteDe(usuario).from('lancamentos').select('id');
    expect(data).toEqual([]);
  });

  test('recusa categoria que não existe entre as de despesa', async ({ request, usuario }) => {
    const token = await tokenDe(request, usuario);

    // "Salário" existe, mas é categoria de receita: não serve para gasto.
    for (const categoria of ['Viagem', 'Salário', '', undefined]) {
      const res = await request.post('/api/quick-add', {
        headers: { Authorization: `Bearer ${token}` },
        data: { categoria, descricao: 'Teste', valor_centavos: 1000 },
      });
      expect(res.status(), String(categoria)).toBe(422);
      expect(await res.json()).toEqual({ erro: 'Categoria de despesa não encontrada. Atualize a lista no Atalho.', mensagem: 'Categoria de despesa não encontrada. Atualize a lista no Atalho.' });
    }

    const { data } = await clienteDe(usuario).from('lancamentos').select('id');
    expect(data).toEqual([]);
  });

  test('aceita valor e descrição num texto só, como o Atalho de 2 passos manda', async ({ request, usuario }) => {
    const token = await tokenDe(request, usuario);
    const enviar = (texto: string) =>
      request.post('/api/quick-add', { headers: { Authorization: `Bearer ${token}` }, data: { categoria: 'Mercado', texto } });

    const res = await enviar('32,90 mercado do bairro');
    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(body.mensagem).toBe('Gasto salvo: Mercado · \u2212 R$ 32,90');
    expect(body.lancamento).toMatchObject({ valor: 3290, descricao: 'mercado do bairro' });

    const semValor = await enviar('uber');
    expect(semValor.status()).toBe(400);
    const msg = 'Não achei o valor. Escreva assim: 32,90 mercado';
    expect(await semValor.json()).toEqual({ erro: msg, mensagem: msg });

    const { data } = await clienteDe(usuario).from('lancamentos').select('descricao, valor');
    expect(data).toEqual([{ descricao: 'mercado do bairro', valor: 3290 }]);
  });

  test('aceita o valor em reais, como vem do teclado numérico do Atalho', async ({ request, usuario }) => {
    const token = await tokenDe(request, usuario);
    const enviar = (data: object) =>
      request.post('/api/quick-add', { headers: { Authorization: `Bearer ${token}` }, data: { categoria: 'Mercado', ...data } });

    // 32,9 no teclado chega como 32.9; 0,1 + 0,2 não pode virar 0,30000000000000004.
    const res = await enviar({ valor: 32.9, descricao: 'padaria' });
    expect(res.status()).toBe(201);
    expect((await res.json()).lancamento).toMatchObject({ valor: 3290, descricao: 'padaria' });
    expect((await enviar({ valor: 0.1 + 0.2, descricao: '' })).status()).toBe(201);

    for (const valor of [0, -5, 0.001, '32,90']) {
      const r = await enviar({ valor, descricao: '' });
      expect(r.status(), String(valor)).toBe(400);
    }

    const { data } = await clienteDe(usuario).from('lancamentos').select('descricao, valor').order('valor');
    // Descrição vazia usa o nome da categoria.
    expect(data).toEqual([
      { descricao: 'Mercado', valor: 30 },
      { descricao: 'padaria', valor: 3290 },
    ]);
  });
});
