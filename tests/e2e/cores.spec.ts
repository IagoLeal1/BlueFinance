import { test, expect, entrar, semearLancamentos } from './fixtures';

/** O fundinho do ícone da linha (o primeiro elemento dela). */
const fundoDoIcone = (page: import('@playwright/test').Page, descricao: string) =>
  page.getByRole('listitem').filter({ hasText: descricao }).locator('span').first();

test.describe('cores por categoria', () => {
  test('cada categoria de gasto tem a sua cor na linha; Outros fica neutro', async ({ page, usuario }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await semearLancamentos(usuario, [
      { valor: 160000, categoria: 'Moradia', descricao: 'Aluguel', forma: 'pix' },
      { valor: 3290, categoria: 'Mercado', descricao: 'Feira' },
      { valor: 5000, categoria: 'Outros', descricao: 'Presente' },
    ]);
    await entrar(page, usuario);
    await page.getByRole('link', { name: 'Lançamentos' }).click();

    await expect(fundoDoIcone(page, 'Aluguel')).toHaveCSS('background-color', 'rgb(225, 236, 249)'); // Moradia: azul
    await expect(fundoDoIcone(page, 'Feira')).toHaveCSS('background-color', 'rgb(252, 234, 227)'); // Mercado: laranja
    await expect(fundoDoIcone(page, 'Presente')).toHaveCSS('background-color', 'rgb(229, 236, 242)'); // Outros: neutro
    // O valor continua dizendo que é gasto.
    await expect(page.getByRole('listitem').filter({ hasText: 'Aluguel' })).toContainText('− R$ 1.600,00');
  });

  test('a categoria Fatura não aparece no botão +', async ({ page, usuario }) => {
    await entrar(page, usuario);
    await page.getByRole('button', { name: 'Novo lançamento' }).click();
    const sheet = page.getByRole('dialog', { name: 'Novo lançamento' });
    await expect(sheet.getByRole('button', { name: 'Outros' })).toBeVisible();
    await expect(sheet.getByRole('button', { name: 'Fatura' })).toHaveCount(0);
  });
});
