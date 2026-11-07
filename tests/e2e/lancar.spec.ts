import { test, expect, entrar } from './fixtures';

test.describe('lançar pelo app', () => {
  test('lança um gasto pelo botão + e ele aparece em Lançamentos, em "Hoje"', async ({ page, usuario }) => {
    await entrar(page, usuario);

    await page.getByRole('button', { name: 'Novo lançamento' }).click();
    const sheet = page.getByRole('dialog', { name: 'Novo lançamento' });
    await expect(sheet.getByRole('radio', { name: 'Despesa' })).toBeChecked();

    await sheet.getByLabel('Valor').pressSequentially('3290');
    await expect(sheet.getByLabel('Valor')).toHaveValue('R$ 32,90');
    await sheet.getByRole('button', { name: 'Mercado' }).click();
    await sheet.getByLabel('Com o quê').fill('Mercado do bairro');
    await sheet.getByRole('button', { name: 'Salvar gasto' }).click();
    await expect(sheet).toBeHidden();

    await page.getByRole('link', { name: 'Lançamentos' }).click();
    const hoje = page.getByRole('region', { name: /^Hoje/ });
    await expect(hoje.getByRole('listitem').filter({ hasText: 'Mercado do bairro' })).toContainText('− R$ 32,90');
  });
});
