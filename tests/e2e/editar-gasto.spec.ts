import { test, expect, entrar, semearCartao, semearLancamentos, type Page } from './fixtures';
import { mesAtual, nomeDoMes, somarMeses } from '../../src/domain/datas';
import { mesDaFatura, mesesDasParcelas } from '../../src/domain/parcelas';

const lancamentosDo = (page: Page, mes: string) => page.goto(mes === mesAtual() ? '/lancamentos' : `/lancamentos?mes=${mes}`);

test.describe('editar data e forma de pagamento', () => {
  test('muda a data e a forma de um gasto: ele vai para o mês da nova data, no Pix', async ({ page, usuario }) => {
    const anterior = somarMeses(mesAtual(), -1);
    await semearLancamentos(usuario, [{ valor: 4500, categoria: 'Mercado', descricao: 'Feira' }]);
    await entrar(page, usuario);
    await page.getByRole('link', { name: 'Lançamentos' }).click();

    await page.getByRole('button', { name: /Feira/ }).click();
    const sheet = page.getByRole('dialog', { name: 'Editar lançamento' });
    await expect(sheet.getByRole('radiogroup', { name: 'Como pagou' }).getByRole('radio', { name: 'Débito' })).toBeChecked();
    await sheet.getByLabel('Quando').fill(`${anterior}-15`);
    await sheet.getByRole('radiogroup', { name: 'Como pagou' }).getByText('Pix', { exact: true }).click();
    await sheet.getByRole('button', { name: 'Salvar alterações' }).click();
    await expect(sheet).toBeHidden();

    await expect(page.getByRole('listitem').filter({ hasText: 'Feira' })).toHaveCount(0);
    await lancamentosDo(page, anterior);
    const linha = page.getByRole('region', { name: /^15 / }).getByRole('listitem').filter({ hasText: 'Feira' });
    await expect(linha).toContainText('Mercado · Pix');
    await expect(linha).toContainText('− R$ 45,00');
  });

  test('passa um gasto do débito para o crédito parcelado: ele vai para as faturas do cartão', async ({ page, usuario }) => {
    await semearCartao(usuario, 'Nubank', 3);
    await semearLancamentos(usuario, [{ valor: 30000, categoria: 'Lazer', descricao: 'Tênis' }]);
    const meses = mesesDasParcelas(mesDaFatura(new Date().toISOString(), 3), 2);
    await entrar(page, usuario);
    await page.getByRole('link', { name: 'Lançamentos' }).click();

    await page.getByRole('button', { name: /Tênis/ }).click();
    const sheet = page.getByRole('dialog', { name: 'Editar lançamento' });
    await sheet.getByRole('radiogroup', { name: 'Como pagou' }).getByText('Crédito', { exact: true }).click();
    await expect(sheet.getByRole('button', { name: 'Nubank' })).toHaveAttribute('aria-pressed', 'true');
    await sheet.getByRole('button', { name: 'Mais' }).click();
    await expect(sheet.getByRole('status')).toHaveText('2x de R$ 150,00');
    await expect(sheet.getByText(`1ª parcela na fatura de ${nomeDoMes(meses[0]!)}`)).toBeVisible();
    await sheet.getByRole('button', { name: 'Salvar alterações' }).click();
    await expect(sheet).toBeHidden();

    for (const [n, mes] of meses.entries()) {
      await lancamentosDo(page, mes);
      const linha = page.getByRole('region', { name: 'Fatura Nubank' }).getByRole('listitem').filter({ hasText: 'Tênis' });
      await expect(linha, mes).toContainText(`Lazer · ${n + 1}/2`);
      await expect(linha, mes).toContainText('− R$ 150,00');
    }
    // Não ficou um débito sobrando no dia da compra.
    await lancamentosDo(page, mesAtual());
    await expect(page.getByRole('region', { name: /^Hoje/ }).getByRole('listitem').filter({ hasText: 'Tênis' })).toHaveCount(0);
  });
});
