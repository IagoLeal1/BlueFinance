import { test, expect, entrar, lancarPeloApp, type Page } from './fixtures';

async function cadastrar(page: Page, { nome, tipo, onde, digitos }: { nome: string; tipo: string; onde: string; digitos: string }) {
  await page.getByRole('button', { name: 'Adicionar investimento' }).click();
  const sheet = page.getByRole('dialog', { name: 'Novo investimento' });
  await sheet.getByLabel('Nome').fill(nome);
  await sheet.getByRole('button', { name: tipo }).click();
  await sheet.getByLabel('Onde está').fill(onde);
  await sheet.getByLabel('Valor atual').pressSequentially(digitos);
  await sheet.getByRole('button', { name: 'Salvar investimento' }).click();
  await sheet.waitFor({ state: 'hidden' });
}

test.describe('investimentos', () => {
  test('cadastra investimentos e eles aparecem agrupados pela instituição, com o total', async ({ page, usuario }) => {
    await entrar(page, usuario);
    await page.getByRole('link', { name: 'Investir' }).click();

    await cadastrar(page, { nome: 'Tesouro Selic 2029', tipo: 'Renda fixa', onde: 'XP', digitos: '2130455' });
    await cadastrar(page, { nome: 'Caixinha reserva', tipo: 'Renda fixa', onde: 'Nubank', digitos: '100000' });

    await expect(page.getByRole('region', { name: 'Patrimônio investido' })).toContainText('R$ 22.304,55');
    const xp = page.getByRole('region', { name: 'XP' });
    await expect(xp.getByRole('listitem').filter({ hasText: 'Tesouro Selic 2029' })).toContainText('R$ 21.304,55');
    await expect(xp.getByRole('listitem').filter({ hasText: 'Tesouro Selic 2029' })).toContainText('Renda fixa');
    await expect(page.getByRole('region', { name: 'Nubank' })).toContainText('Caixinha reserva');
  });

  test('registra um aporte: soma no investimento e no "Investiu" do mês', async ({ page, usuario }) => {
    await entrar(page, usuario);
    await page.getByRole('link', { name: 'Investir' }).click();
    await cadastrar(page, { nome: 'Tesouro Selic 2029', tipo: 'Renda fixa', onde: 'XP', digitos: '100000' });

    await lancarPeloApp(page, { tipo: 'Investimento', digitos: '50000', categoria: 'Tesouro Selic 2029', descricao: 'Aporte mensal' });

    await expect(page.getByRole('region', { name: 'XP' }).getByRole('listitem')).toContainText('R$ 1.500,00');
    await page.getByRole('link', { name: 'Início' }).click();
    await expect(page.getByRole('region', { name: /^Resumo de / }).getByRole('group', { name: 'Investiu' })).toContainText('R$ 500');
  });
});
