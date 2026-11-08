import { test, expect, entrar, semearCartao, type Page } from './fixtures';
import { mesAtual, nomeDoMes } from '../../src/domain/datas';
import { mesDaFatura, mesesDasParcelas } from '../../src/domain/parcelas';

const FECHAMENTO = 3;
const lancamentosDo = (page: Page, mes: string) => page.goto(mes === mesAtual() ? '/lancamentos' : `/lancamentos?mes=${mes}`);

test.describe('compras no crédito', () => {
  test('lança uma compra parcelada e cada parcela cai na fatura do seu mês', async ({ page, usuario }) => {
    await semearCartao(usuario, 'Nubank', FECHAMENTO);
    const meses = mesesDasParcelas(mesDaFatura(new Date().toISOString(), FECHAMENTO), 3);
    await entrar(page, usuario);

    await page.getByRole('button', { name: 'Novo lançamento' }).click();
    const sheet = page.getByRole('dialog', { name: 'Novo lançamento' });
    await sheet.getByLabel('Valor').pressSequentially('120000');
    await sheet.getByRole('button', { name: 'Lazer' }).click();
    await sheet.getByRole('radiogroup', { name: 'Como pagou' }).getByText('Crédito', { exact: true }).click();
    await expect(sheet.getByRole('button', { name: 'Nubank' })).toHaveAttribute('aria-pressed', 'true');
    await sheet.getByRole('button', { name: 'Mais' }).click();
    await sheet.getByRole('button', { name: 'Mais' }).click();
    await expect(sheet.getByRole('status')).toHaveText('3x de R$ 400,00');
    await expect(sheet.getByText(`1ª parcela na fatura de ${nomeDoMes(meses[0]!)}`)).toBeVisible();
    await sheet.getByLabel('Com o quê (opcional)').fill('Fone de ouvido');
    await sheet.getByRole('button', { name: 'Salvar gasto' }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Compra salva' })).toContainText('3x de R$ 400,00');

    for (const [n, mes] of meses.entries()) {
      await lancamentosDo(page, mes);
      const linha = page.getByRole('listitem').filter({ hasText: 'Fone de ouvido' });
      await expect(linha, mes).toContainText(`${n + 1}/3`);
      await expect(linha, mes).toContainText('− R$ 400,00');
    }
    const [ano, m] = meses[2]!.split('-').map(Number) as [number, number];
    await lancamentosDo(page, m === 12 ? `${ano + 1}-01` : `${ano}-${String(m + 1).padStart(2, '0')}`);
    await expect(page.getByRole('listitem').filter({ hasText: 'Fone de ouvido' })).toHaveCount(0);
  });

  test('Desfazer apaga todas as parcelas da compra', async ({ page, usuario }) => {
    await semearCartao(usuario, 'Nubank', FECHAMENTO);
    const meses = mesesDasParcelas(mesDaFatura(new Date().toISOString(), FECHAMENTO), 2);
    await entrar(page, usuario);

    await page.getByRole('button', { name: 'Novo lançamento' }).click();
    const sheet = page.getByRole('dialog', { name: 'Novo lançamento' });
    await sheet.getByLabel('Valor').pressSequentially('30000');
    await sheet.getByRole('button', { name: 'Lazer' }).click();
    await sheet.getByRole('radiogroup', { name: 'Como pagou' }).getByText('Crédito', { exact: true }).click();
    await sheet.getByRole('button', { name: 'Mais' }).click();
    await sheet.getByLabel('Com o quê (opcional)').fill('Show');
    await sheet.getByRole('button', { name: 'Salvar gasto' }).click();
    await page.getByRole('status').filter({ hasText: 'Compra salva' }).getByRole('button', { name: 'Desfazer' }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Lançamento desfeito' })).toBeVisible();

    for (const mes of meses) {
      await lancamentosDo(page, mes);
      await expect(page.getByRole('listitem').filter({ hasText: 'Show' }), mes).toHaveCount(0);
    }
  });
});
