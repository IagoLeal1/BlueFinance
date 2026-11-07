import { test, expect, entrar, lancarPeloApp, semearLancamentos } from './fixtures';

test.describe('tela Início', () => {
  test('sem lançamentos, mostra o mês zerado e explica como lançar o primeiro', async ({ page, usuario }) => {
    await entrar(page, usuario);

    const resumo = page.getByRole('region', { name: /^Resumo de / });
    await expect(resumo.getByText('R$ 0,00')).toBeVisible();
    await expect(page.getByText('Nenhum lançamento ainda.')).toBeVisible();
    await expect(page.getByText('Toque em + ou aperte o Botão de Ação do iPhone para lançar sem abrir o app.')).toBeVisible();
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

  test('mostra os 3 últimos lançamentos, do mais novo para o mais antigo', async ({ page, usuario }) => {
    const ha = (min: number) => new Date(Date.now() - min * 60_000).toISOString();
    await semearLancamentos(usuario, [
      { valor: 1000, categoria: 'Mercado', descricao: 'Padaria', data: ha(40) },
      { valor: 2000, categoria: 'Transporte', descricao: 'Uber', data: ha(30) },
      { valor: 3000, categoria: 'Alimentação', descricao: 'Almoço', data: ha(20) },
      { valor: 4000, categoria: 'Lazer', descricao: 'Cinema', data: ha(10) },
    ]);
    await entrar(page, usuario);

    const ultimos = page.getByRole('region', { name: 'Últimos' });
    await expect(ultimos.getByRole('listitem')).toHaveCount(3);
    await expect(ultimos.getByRole('listitem').nth(0)).toContainText('Cinema');
    await expect(ultimos.getByRole('listitem').nth(1)).toContainText('Almoço');
    await expect(ultimos.getByRole('listitem').nth(2)).toContainText('Uber');

    await ultimos.getByRole('link', { name: 'Ver todos' }).click();
    await expect(page).toHaveURL('/lancamentos');
  });
});
