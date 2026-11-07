import { test, expect } from './fixtures';

test.describe('entrar', () => {
  test('entra com e-mail e senha e cai na tela Início', async ({ page, usuario }) => {
    await page.goto('/');
    await expect(page).toHaveURL('/entrar');

    await page.getByLabel('E-mail').fill(usuario.email);
    await page.getByLabel('Senha').fill(usuario.senha);
    await page.getByRole('button', { name: 'Entrar' }).click();

    await expect(page).toHaveURL('/');
    await expect(page.getByRole('link', { name: 'Início' })).toHaveAttribute('aria-current', 'page');
  });

  test('avisa quando a senha está errada e continua na tela de entrar', async ({ page, usuario }) => {
    await page.goto('/entrar');
    await page.getByLabel('E-mail').fill(usuario.email);
    await page.getByLabel('Senha').fill('senha-errada');
    await page.getByRole('button', { name: 'Entrar' }).click();

    await expect(page.getByRole('alert').filter({ hasText: 'E-mail ou senha incorretos.' })).toBeVisible();
    await expect(page).toHaveURL('/entrar');
  });
});
