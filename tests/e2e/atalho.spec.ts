import { test, expect, entrar } from './fixtures';

test.describe('Atalho do iOS', () => {
  test('um gasto feito pelo Atalho aparece no app', async ({ page, usuario }) => {
    // O que o Atalho faz: gera o token uma vez (em Ajustes) e depois chama a API sem abrir o app.
    const { token } = await (
      await page.request.post('/api/tokens', { headers: { Authorization: `Bearer ${usuario.sessao}` } })
    ).json();
    const res = await page.request.post('/api/quick-add', {
      headers: { Authorization: `Bearer ${token}` },
      data: { categoria: 'Transporte', descricao: 'Uber para o trabalho', valor_centavos: 1840 },
    });
    expect(res.status()).toBe(201);

    await entrar(page, usuario);
    await expect(page.getByRole('region', { name: /^Resumo de / }).getByRole('group', { name: 'Saiu' })).toContainText('R$ 18');
    await page.getByRole('link', { name: 'Lançamentos' }).click();
    await expect(page.getByRole('region', { name: /^Hoje/ }).getByRole('listitem').filter({ hasText: 'Uber para o trabalho' })).toContainText(
      '− R$ 18,40',
    );
  });
});
