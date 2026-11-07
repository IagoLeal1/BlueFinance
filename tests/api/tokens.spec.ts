import { test, expect, tokenDe } from './fixtures';

test.describe('token pessoal do Atalho', () => {
  test('gera um token pessoal para quem está logado', async ({ request, usuario }) => {
    const res = await request.post('/api/tokens', { headers: { Authorization: `Bearer ${usuario.sessao}` } });

    expect(res.status()).toBe(201);
    const { token } = await res.json();
    expect(token).toMatch(/^bf_[A-Za-z0-9_-]{43}$/);
  });

  test('recusa gerar token sem login ou com sessão inválida', async ({ request }) => {
    for (const headers of [{}, { Authorization: 'Bearer sessao-falsa' }] as Record<string, string>[]) {
      const res = await request.post('/api/tokens', { headers });
      expect(res.status(), JSON.stringify(headers)).toBe(401);
      expect(await res.json()).toEqual({ erro: 'Faça login para gerar um token.' });
    }
  });

  test('gerar um token novo invalida o anterior', async ({ request, usuario }) => {
    const antigo = await tokenDe(request, usuario);
    const novo = await tokenDe(request, usuario);
    const categorias = (token: string) =>
      request.get('/api/quick-add/categorias', { headers: { Authorization: `Bearer ${token}` } });

    expect((await categorias(antigo)).status()).toBe(401);
    expect((await categorias(novo)).status()).toBe(200);
  });
});
