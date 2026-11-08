import { test, expect, entrar } from './fixtures';

test.describe('ajustes', () => {
  test('gera o token do Atalho, mostra uma única vez e ele funciona na API', async ({ page, usuario }) => {
    await entrar(page, usuario);
    await page.getByRole('link', { name: 'Ajustes' }).click();

    await page.getByRole('button', { name: 'Gerar token do Atalho' }).click();
    const campo = page.getByLabel('Token do Atalho');
    await expect(campo).toHaveValue(/^bf_[A-Za-z0-9_-]{43}$/);
    await expect(page.getByRole('button', { name: 'Copiar' })).toBeVisible();

    const token = await campo.inputValue();
    const res = await page.request.get('/api/quick-add/categorias', { headers: { Authorization: `Bearer ${token}` } });
    expect(res.status()).toBe(200);

    await page.reload();
    await expect(page.getByLabel('Token do Atalho')).toHaveCount(0);
    await expect(page.getByText(/^Token criado em /)).toBeVisible();
  });

  test('ensina a lançar sem abrir o app pelo Botão de Ação', async ({ page, usuario }) => {
    await entrar(page, usuario);
    await page.getByRole('link', { name: 'Ajustes' }).click();

    const secao = page.getByRole('region', { name: 'Lançar sem abrir o app' });
    await expect(secao.getByRole('listitem')).toHaveCount(3);
    await expect(secao).toContainText('Botão de Ação');
    await expect(page.getByRole('region', { name: 'Conta' })).toContainText(usuario.email);
  });

  test('Aviso da fatura: aberto pelo Safari, explica que precisa estar na Tela de Início', async ({ page, usuario }) => {
    await entrar(page, usuario);
    await page.getByRole('link', { name: 'Ajustes' }).click();
    const aviso = page.getByRole('region', { name: 'Aviso da fatura' });
    await expect(aviso).toContainText('Um dia antes e no dia do vencimento, às 9h.');
    await expect(aviso.getByRole('switch', { name: 'Aviso da fatura' })).toBeDisabled();
    await expect(aviso).toContainText('Adicionar à Tela de Início');
  });
});
