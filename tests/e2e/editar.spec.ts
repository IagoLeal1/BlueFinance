import { test, expect, entrar, lancarPeloApp } from './fixtures';

test.describe('editar e excluir', () => {
  test('edita o valor e a descrição de um gasto e depois exclui', async ({ page, usuario }) => {
    await entrar(page, usuario);
    await lancarPeloApp(page, { digitos: '3290', categoria: 'Mercado', descricao: 'Mercado do bairro' });
    await page.getByRole('link', { name: 'Lançamentos' }).click();

    await page.getByRole('button', { name: /Mercado do bairro/ }).click();
    const sheet = page.getByRole('dialog', { name: 'Editar lançamento' });
    const valor = sheet.getByLabel('Valor');
    await expect(valor).toHaveValue('R$ 32,90');
    await valor.press('Backspace');
    await valor.press('Backspace');
    await valor.press('Backspace');
    await valor.press('Backspace');
    await valor.pressSequentially('4500');
    await expect(valor).toHaveValue('R$ 45,00');
    await sheet.getByLabel('Com o quê').fill('Mercado grande');
    await sheet.getByRole('button', { name: 'Salvar alterações' }).click();
    await expect(sheet).toBeHidden();

    const linha = page.getByRole('listitem').filter({ hasText: 'Mercado grande' });
    await expect(linha).toContainText('− R$ 45,00');

    await page.getByRole('button', { name: /Mercado grande/ }).click();
    await sheet.getByRole('button', { name: 'Excluir lançamento' }).click();
    await expect(sheet.getByText('Excluir de vez? Isso não pode ser desfeito.')).toBeVisible();
    await sheet.getByRole('button', { name: 'Sim, excluir' }).click();

    await expect(page.getByText('Nenhum lançamento neste mês.')).toBeVisible();
  });
});
