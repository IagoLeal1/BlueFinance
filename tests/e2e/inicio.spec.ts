import { test, expect, entrar } from './fixtures';

test.describe('tela Início', () => {
  test('sem lançamentos, mostra o mês zerado e explica como lançar o primeiro', async ({ page, usuario }) => {
    await entrar(page, usuario);

    const resumo = page.getByRole('region', { name: /^Resumo de / });
    await expect(resumo.getByText('R$ 0,00')).toBeVisible();
    await expect(page.getByText('Nenhum lançamento ainda.')).toBeVisible();
    await expect(page.getByText('Toque em + ou dê dois toques nas costas do iPhone.')).toBeVisible();
  });
});
