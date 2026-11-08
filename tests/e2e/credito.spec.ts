import { test, expect, entrar, semearCartao, semearLancamentos, type Page, type Usuario } from './fixtures';
import { mesAtual, nomeDoMes, somarMeses } from '../../src/domain/datas';
import { mesDaFatura, mesesDasParcelas } from '../../src/domain/parcelas';

const FECHAMENTO = 3;
const lancamentosDo = (page: Page, mes: string) => page.goto(mes === mesAtual() ? '/lancamentos' : `/lancamentos?mes=${mes}`);

/** Fone de ouvido em 3x de R$ 400,00 no Nubank, com a 1ª parcela na fatura deste mês. */
async function semearFoneEm3x(usuario: Usuario) {
  const mes = mesAtual();
  await semearCartao(usuario, 'Nubank', FECHAMENTO);
  await semearLancamentos(
    usuario,
    [1, 2, 3].map((parcela) => ({
      valor: 40000, categoria: 'Lazer', descricao: 'Fone de ouvido',
      credito: { cartao: 'Nubank', parcela, parcelas: 3, competencia: somarMeses(mes, parcela - 1), compra: 'fone' },
    })),
  );
  return [mes, somarMeses(mes, 1), somarMeses(mes, 2)] as const;
}

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

  test('tocar numa parcela abre a compra inteira; mudar total e parcelas refaz a divisão', async ({ page, usuario }) => {
    const meses = await semearFoneEm3x(usuario);
    await entrar(page, usuario);
    await lancamentosDo(page, meses[1]); // abre pela 2ª parcela

    await page.getByRole('button', { name: /Fone de ouvido/ }).click();
    const sheet = page.getByRole('dialog', { name: 'Compra parcelada' });
    await expect(sheet.getByLabel('Valor')).toHaveValue('R$ 1.200,00');
    await expect(sheet.getByRole('status')).toHaveText('3x de R$ 400,00');
    await expect(sheet.getByRole('listitem')).toHaveText([
      `1/3 · fatura de ${nomeDoMes(meses[0])}R$ 400,00`,
      `2/3 · fatura de ${nomeDoMes(meses[1])}R$ 400,00`,
      `3/3 · fatura de ${nomeDoMes(meses[2])}R$ 400,00`,
    ]);

    await sheet.getByRole('button', { name: 'Menos' }).click();
    const valor = sheet.getByLabel('Valor');
    for (let i = 0; i < 6; i++) await valor.press('Backspace');
    await valor.pressSequentially('100001');
    await expect(sheet.getByRole('status')).toHaveText('2x de R$ 500,00');
    await expect(sheet.getByRole('listitem')).toHaveText([
      `1/2 · fatura de ${nomeDoMes(meses[0])}R$ 500,01`,
      `2/2 · fatura de ${nomeDoMes(meses[1])}R$ 500,00`,
    ]);
    await sheet.getByLabel('Com o quê').fill('Fone bom');
    await sheet.getByRole('button', { name: 'Salvar alterações' }).click();
    await expect(sheet).toBeHidden();

    for (const [mes, texto] of [[meses[0], '1/2'], [meses[1], '2/2']] as const) {
      await lancamentosDo(page, mes);
      const linha = page.getByRole('listitem').filter({ hasText: 'Fone bom' });
      await expect(linha, mes).toContainText(texto);
      await expect(linha, mes).toContainText(mes === meses[0] ? '− R$ 500,01' : '− R$ 500,00');
    }
    await lancamentosDo(page, meses[2]);
    await expect(page.getByRole('listitem').filter({ hasText: /Fone/ })).toHaveCount(0);
  });

  test('excluir a compra apaga todas as parcelas, com confirmação', async ({ page, usuario }) => {
    const meses = await semearFoneEm3x(usuario);
    await entrar(page, usuario);
    await lancamentosDo(page, meses[0]);

    await page.getByRole('button', { name: /Fone de ouvido/ }).click();
    const sheet = page.getByRole('dialog', { name: 'Compra parcelada' });
    await sheet.getByRole('button', { name: 'Excluir as 3 parcelas' }).click();
    await expect(sheet.getByText('Excluir as 3 parcelas de vez? Isso não pode ser desfeito.')).toBeVisible();
    await sheet.getByRole('button', { name: 'Sim, excluir' }).click();
    await expect(sheet).toBeHidden();

    for (const mes of meses) {
      await lancamentosDo(page, mes);
      await expect(page.getByRole('listitem').filter({ hasText: 'Fone de ouvido' }), mes).toHaveCount(0);
    }
  });
});
