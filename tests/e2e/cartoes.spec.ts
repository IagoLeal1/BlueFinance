import { test, expect, entrar } from './fixtures';

test.describe('cartões de crédito', () => {
  test('cadastra, edita e exclui um cartão em Ajustes', async ({ page, usuario }) => {
    await entrar(page, usuario);
    await page.getByRole('link', { name: 'Ajustes' }).click();
    const cartoes = page.getByRole('region', { name: 'Cartões de crédito' });

    await cartoes.getByRole('button', { name: 'Adicionar cartão' }).click();
    const novo = page.getByRole('dialog', { name: 'Novo cartão' });
    await novo.getByLabel('Nome').fill('Nubank');
    const fecha = novo.getByRole('group', { name: 'Dia que a fatura fecha' });
    await fecha.getByRole('button', { name: 'Mais' }).click();
    await fecha.getByRole('button', { name: 'Mais' }).click();
    await expect(fecha.getByRole('status')).toHaveText('dia 3');
    const vence = novo.getByRole('group', { name: 'Dia do vencimento' });
    await expect(vence.getByRole('status')).toHaveText('dia 10');
    await vence.getByRole('button', { name: 'Mais' }).click();
    await novo.getByRole('button', { name: 'Salvar cartão' }).click();
    await expect(novo).toBeHidden();
    await expect(cartoes.getByRole('listitem')).toContainText('NubankFecha dia 3 · vence dia 11');

    await cartoes.getByRole('button', { name: /Nubank/ }).click();
    const editar = page.getByRole('dialog', { name: 'Editar cartão' });
    await expect(editar.getByRole('group', { name: 'Dia do vencimento' }).getByRole('status')).toHaveText('dia 11');
    await editar.getByLabel('Nome').fill('Nubank Roxinho');
    await editar.getByRole('button', { name: 'Salvar cartão' }).click();
    await expect(editar).toBeHidden();
    await expect(cartoes.getByRole('listitem')).toContainText('Nubank Roxinho');

    await cartoes.getByRole('button', { name: /Nubank Roxinho/ }).click();
    await editar.getByRole('button', { name: 'Excluir cartão' }).click();
    await editar.getByRole('button', { name: 'Sim, excluir' }).click();
    await expect(cartoes.getByRole('listitem')).toHaveCount(0);
  });
});
