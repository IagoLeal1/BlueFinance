import { test, expect, entrar, semearCartao, semearLancamentos, semearVr } from './fixtures';
import { mesAtual, nomeDoMes } from '../../src/domain/datas';

test.describe('Lançamentos: quanto foi em cada categoria', () => {
  test('tocar numa categoria mostra o total do mês, de qualquer jeito que foi pago, e só os gastos dela', async ({ page, usuario }) => {
    const mes = mesAtual();
    await semearCartao(usuario, 'C6bank', 4, 11);
    await semearVr(usuario, { valorMensal: 90000, dia: 5, saldo: 50000 });
    await semearLancamentos(usuario, [
      { valor: 17680, categoria: 'Mercado', descricao: 'Atacadão' },
      { valor: 3290, categoria: 'Mercado', descricao: 'Mercado do bairro', forma: 'pix' },
      { valor: 10000, categoria: 'Mercado', descricao: 'Hortifruti', forma: 'vr' },
      { valor: 33240, categoria: 'Mercado', descricao: 'Compra do mês', credito: { cartao: 'C6bank', parcela: 1, parcelas: 1, competencia: mes } },
      { valor: 1840, categoria: 'Transporte', descricao: 'Uber', forma: 'pix' },
      { tipo: 'receita', valor: 850000, categoria: 'Salário', descricao: 'Salário' },
    ]);
    await entrar(page, usuario);
    await page.goto('/lancamentos');

    // Só as categorias com gasto no mês, na ordem do app.
    const categorias = page.getByRole('group', { name: 'Categoria' });
    await expect(categorias.getByRole('button')).toHaveText(['Tudo', 'Mercado', 'Transporte']);
    await expect(categorias.getByRole('button', { name: 'Tudo' })).toHaveAttribute('aria-pressed', 'true');

    await categorias.getByRole('button', { name: 'Mercado' }).click();
    await expect(categorias.getByRole('button', { name: 'Mercado' })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByRole('radiogroup', { name: 'Extrato' })).toBeHidden();
    const total = page.getByRole('region', { name: `Mercado em ${nomeDoMes(mes)}` });
    await expect(total).toContainText('R$ 642,10');
    await expect(total).toContainText('4 gastos · 97% do que você gastou no mês');
    await expect(total.getByRole('group', { name: 'Débito e Pix' })).toContainText('R$ 210');
    await expect(total.getByRole('group', { name: 'Crédito' })).toContainText('R$ 332');
    await expect(total.getByRole('group', { name: 'VR' })).toContainText('R$ 100');

    for (const gasto of ['Atacadão', 'Mercado do bairro', 'Hortifruti']) await expect(page.getByRole('button', { name: new RegExp(gasto) })).toBeVisible();
    const fatura = page.getByRole('region', { name: `Na fatura de ${nomeDoMes(mes)} · C6bank` });
    await expect(fatura.getByRole('button', { name: /Compra do mês/ })).toBeVisible();
    await expect(page.getByText('Uber')).toBeHidden();
    await expect(page.getByText('Salário')).toBeHidden();

    // "Tudo" volta para o extrato de sempre.
    await categorias.getByRole('button', { name: 'Tudo' }).click();
    await expect(page.getByRole('radiogroup', { name: 'Extrato' })).toBeVisible();
    await expect(page.getByRole('button', { name: /Uber/ })).toBeVisible();
  });

  test('no Início, tocar numa categoria de "Gastos por categoria" abre Lançamentos já filtrado nela', async ({ page, usuario }) => {
    await semearLancamentos(usuario, [
      { valor: 3290, categoria: 'Mercado', descricao: 'Mercado do bairro', forma: 'pix' },
      { valor: 1840, categoria: 'Transporte', descricao: 'Uber', forma: 'pix' },
    ]);
    await entrar(page, usuario);

    await page.getByRole('region', { name: 'Gastos por categoria' }).getByRole('link', { name: /Mercado/ }).click();
    await expect(page).toHaveURL(/\/lancamentos\?categoria=Mercado/);
    await expect(page.getByRole('group', { name: 'Categoria' }).getByRole('button', { name: 'Mercado' })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByRole('region', { name: `Mercado em ${nomeDoMes(mesAtual())}` })).toContainText('R$ 32,90');
    await expect(page.getByText('Uber')).toBeHidden();
  });
});
