import { test, expect, entrar, semearCartao, semearLancamentos, semearVr, type Page } from './fixtures';
import { mesAtual, nomeDoMes } from '../../src/domain/datas';

const aba = (page: Page, nome: string) => page.getByRole('radiogroup', { name: 'Extrato' }).getByText(nome, { exact: true }).click();

test.describe('Lançamentos: quanto foi em cada categoria', () => {
  test('a categoria filtra a aba em que você está: Crédito, Débito e VR', async ({ page, usuario }) => {
    const mes = mesAtual();
    await semearCartao(usuario, 'C6bank', 4, 11);
    await semearVr(usuario, { valorMensal: 90000, dia: 5, saldo: 50000 });
    await semearLancamentos(usuario, [
      { valor: 17680, categoria: 'Mercado', descricao: 'Atacadão' },
      { valor: 3290, categoria: 'Mercado', descricao: 'Mercado do bairro', forma: 'pix' },
      { valor: 10000, categoria: 'Mercado', descricao: 'Hortifruti', forma: 'vr' },
      { valor: 33240, categoria: 'Mercado', descricao: 'Compra do mês', credito: { cartao: 'C6bank', parcela: 1, parcelas: 1, competencia: mes } },
      { valor: 40000, categoria: 'Lazer', descricao: 'Fone de ouvido', credito: { cartao: 'C6bank', parcela: 1, parcelas: 3, competencia: mes } },
      { valor: 1840, categoria: 'Transporte', descricao: 'Uber', forma: 'pix' },
      { tipo: 'receita', valor: 850000, categoria: 'Salário', descricao: 'Salário' },
    ]);
    await entrar(page, usuario);
    await page.goto('/lancamentos?ver=credito');

    // Só as categorias com gasto no mês, na ordem do app.
    const categorias = page.getByRole('group', { name: 'Categoria' });
    await expect(categorias.getByRole('button')).toHaveText(['Tudo', 'Mercado', 'Transporte', 'Lazer']);
    await expect(categorias.getByRole('button', { name: 'Tudo' })).toHaveAttribute('aria-pressed', 'true');
    const fatura = page.getByRole('region', { name: 'Fatura C6bank' });
    await expect(fatura).toContainText('Fone de ouvido');

    // No Crédito, Mercado deixa na fatura só as compras de Mercado, com o total delas.
    await categorias.getByRole('button', { name: 'Mercado' }).click();
    await expect(page.getByRole('radiogroup', { name: 'Extrato' }).getByRole('radio', { name: 'Crédito' })).toBeChecked();
    const noCredito = page.getByRole('region', { name: `Mercado no Crédito · ${nomeDoMes(mes)}` });
    await expect(noCredito).toContainText('R$ 332,40');
    await expect(noCredito).toContainText('1 compra · Mercado no mês, somando tudo: R$ 642,10 (61%)');
    await expect(fatura).toContainText('Compra do mês');
    await expect(fatura).toContainText('R$ 332,40');
    await expect(fatura).not.toContainText('Fone de ouvido');

    // Trocar de aba mantém a categoria: no Débito, só os gastos de Mercado na conta.
    await aba(page, 'Débito');
    await expect(categorias.getByRole('button', { name: 'Mercado' })).toHaveAttribute('aria-pressed', 'true');
    const noDebito = page.getByRole('region', { name: `Mercado no Débito · ${nomeDoMes(mes)}` });
    await expect(noDebito).toContainText('R$ 209,70');
    await expect(noDebito).toContainText('2 gastos');
    for (const gasto of ['Atacadão', 'Mercado do bairro']) await expect(page.getByRole('button', { name: new RegExp(gasto) })).toBeVisible();
    await expect(page.getByText('Uber')).toBeHidden();
    await expect(page.getByText('Salário')).toBeHidden();
    await expect(page.getByRole('link', { name: /Fatura C6bank/ })).toBeHidden();

    // No VR, só os pagos com VR; o saldo dá lugar ao total da categoria.
    await aba(page, 'VR');
    await expect(page.getByRole('region', { name: `Mercado no VR · ${nomeDoMes(mes)}` })).toContainText('R$ 100,00');
    await expect(page.getByRole('button', { name: /Hortifruti/ })).toBeVisible();
    await expect(page.getByRole('region', { name: 'Saldo do VR' })).toBeHidden();
    await expect(page.getByText('Saldo inicial do VR')).toBeHidden();

    // Categoria sem gasto na aba: o total fica zerado.
    await categorias.getByRole('button', { name: 'Transporte' }).click();
    await expect(page.getByRole('region', { name: `Transporte no VR · ${nomeDoMes(mes)}` })).toContainText('Nenhum gasto de Transporte no VR');

    // "Tudo" volta para o extrato de sempre.
    await categorias.getByRole('button', { name: 'Tudo' }).click();
    await expect(page.getByRole('region', { name: 'Saldo do VR' })).toBeVisible();
    await aba(page, 'Débito');
    await expect(page.getByRole('button', { name: /Uber/ })).toBeVisible();
    await expect(page.getByRole('link', { name: /Fatura C6bank/ })).toBeVisible();
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
    await expect(page.getByRole('region', { name: `Mercado no Débito · ${nomeDoMes(mesAtual())}` })).toContainText('R$ 32,90');
    await expect(page.getByText('Uber')).toBeHidden();
  });
});
