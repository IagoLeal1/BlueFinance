import { test, expect, entrar, lancarPeloApp } from './fixtures';

test.describe('tela Início', () => {
  test('sem lançamentos, mostra o mês zerado e explica como lançar o primeiro', async ({ page, usuario }) => {
    await entrar(page, usuario);

    const resumo = page.getByRole('region', { name: /^Resumo de / });
    await expect(resumo.getByText('R$ 0,00')).toBeVisible();
    await expect(page.getByText('Nenhum lançamento ainda.')).toBeVisible();
    await expect(page.getByText('Toque em + ou dê dois toques nas costas do iPhone.')).toBeVisible();
  });

  test('depois de um gasto, atualiza o resumo do mês e os gastos por categoria', async ({ page, usuario }) => {
    await entrar(page, usuario);
    await lancarPeloApp(page, { digitos: '3290', categoria: 'Mercado', descricao: 'Mercado do bairro' });

    const resumo = page.getByRole('region', { name: /^Resumo de / });
    await expect(resumo.getByText('\u2212 R$ 32,90')).toBeVisible(); // sobrou: nada entrou ainda
    await expect(resumo.getByRole('group', { name: 'Saiu' })).toContainText('R$ 33');
    await expect(resumo.getByRole('group', { name: 'Entrou' })).toContainText('R$ 0');

    const gastos = page.getByRole('region', { name: 'Gastos por categoria' });
    await expect(gastos.getByRole('listitem').filter({ hasText: 'Mercado' })).toContainText(['R$ 32,90', '100%'].join(''));
    await expect(page.getByText('Nenhum lançamento ainda.')).toBeHidden();
  });
});
