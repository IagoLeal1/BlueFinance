import { test, expect, entrar, semearCartao, semearLancamentos, type Page, type Usuario } from './fixtures';
import { mesAtual, nomeDoMes, somarMeses } from '../../src/domain/datas';
import { mesDaFatura, mesesDasParcelas } from '../../src/domain/parcelas';

/** Abre Lançamentos no mês, no extrato do Crédito (compras no cartão) ou do Débito (a conta). */
const lancamentosDo = (page: Page, mes: string, ver: 'credito' | 'debito' = 'credito') =>
  page.goto(`/lancamentos?ver=${ver}${mes === mesAtual() ? '' : `&mes=${mes}`}`);
const CURTOS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

/**
 * Fone de ouvido em 3x de R$ 400,00, comprado no dia 7 do mês passado no Nubank (fecha dia 3):
 * parcelas neste mês e nos dois seguintes. O Itaú fecha dia 25.
 */
async function semearFoneEm3x(usuario: Usuario) {
  const mes = mesAtual();
  const anterior = somarMeses(mes, -1);
  await semearCartao(usuario, 'Nubank', 3);
  await semearCartao(usuario, 'Itaú', 25);
  await semearLancamentos(
    usuario,
    [1, 2, 3].map((parcela) => ({
      valor: 40000, categoria: 'Lazer', descricao: 'Fone de ouvido', data: `${anterior}-07T12:00:00-03:00`,
      credito: { cartao: 'Nubank', parcela, parcelas: 3, competencia: somarMeses(mes, parcela - 1), compra: 'fone' },
    })),
  );
  return { anterior, mes, seguinte: somarMeses(mes, 1), depois: somarMeses(mes, 2) };
}

async function abrirCompra(page: Page) {
  await page.getByRole('button', { name: /Fone de ouvido/ }).click();
  return page.getByRole('dialog', { name: 'Compra parcelada' });
}

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
    await lancamentosDo(page, anterior, 'debito');
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
    await lancamentosDo(page, mesAtual(), 'debito');
    await expect(page.getByRole('region', { name: /^Hoje/ }).getByRole('listitem').filter({ hasText: 'Tênis' })).toHaveCount(0);
  });

  test('mudar a data da compra refaz as faturas das parcelas', async ({ page, usuario }) => {
    const m = await semearFoneEm3x(usuario);
    await entrar(page, usuario);
    await lancamentosDo(page, mesAtual());

    const sheet = await abrirCompra(page);
    await expect(sheet.getByLabel('Quando')).toHaveValue(`${m.anterior}-07`);
    await sheet.getByLabel('Quando').fill(`${m.anterior}-02`); // antes do fechamento do Nubank (dia 3)
    await expect(sheet.getByRole('listitem')).toHaveText([
      `1/3 · fatura de ${nomeDoMes(m.anterior)}R$ 400,00`,
      `2/3 · fatura de ${nomeDoMes(m.mes)}R$ 400,00`,
      `3/3 · fatura de ${nomeDoMes(m.seguinte)}R$ 400,00`,
    ]);
    await sheet.getByRole('button', { name: 'Salvar alterações' }).click();
    await expect(sheet).toBeHidden();

    await lancamentosDo(page, m.anterior);
    await expect(page.getByRole('region', { name: 'Fatura Nubank' }).getByRole('listitem').filter({ hasText: 'Fone de ouvido' }))
      .toContainText(`Lazer · 1/3 · comprado em 2 ${CURTOS[Number(m.anterior.slice(5)) - 1]}`);
    await lancamentosDo(page, m.depois);
    await expect(page.getByRole('listitem').filter({ hasText: 'Fone de ouvido' })).toHaveCount(0);
  });

  test('trocar o cartão de uma compra leva as parcelas para as faturas dele', async ({ page, usuario }) => {
    const m = await semearFoneEm3x(usuario);
    await entrar(page, usuario);
    await lancamentosDo(page, mesAtual());

    const sheet = await abrirCompra(page);
    await expect(sheet.getByRole('button', { name: 'Nubank' })).toHaveAttribute('aria-pressed', 'true');
    await sheet.getByRole('button', { name: 'Itaú' }).click(); // dia 7 é antes do fechamento do Itaú (25)
    await sheet.getByRole('button', { name: 'Salvar alterações' }).click();
    await expect(sheet).toBeHidden();

    for (const [n, mes] of [m.anterior, m.mes, m.seguinte].entries()) {
      await lancamentosDo(page, mes);
      await expect(page.getByRole('region', { name: 'Fatura Itaú' }).getByRole('listitem').filter({ hasText: 'Fone de ouvido' }), mes)
        .toContainText(`${n + 1}/3`);
    }
    await expect(page.getByRole('region', { name: 'Fatura Nubank' })).toHaveCount(0);
  });

  test('passar a compra para Débito desfaz o parcelamento: vira um gasto só, no mês da data', async ({ page, usuario }) => {
    const m = await semearFoneEm3x(usuario);
    await entrar(page, usuario);
    await lancamentosDo(page, mesAtual());

    const sheet = await abrirCompra(page);
    await sheet.getByRole('radiogroup', { name: 'Como pagou' }).getByText('Débito', { exact: true }).click();
    await expect(sheet.getByText(`Vira um gasto só de R$ 1.200,00 em 7 ${CURTOS[Number(m.anterior.slice(5)) - 1]}.`)).toBeVisible();
    await sheet.getByRole('button', { name: 'Salvar alterações' }).click();
    await expect(sheet).toBeHidden();

    await lancamentosDo(page, m.anterior, 'debito');
    const linha = page.getByRole('region', { name: /^7 / }).getByRole('listitem').filter({ hasText: 'Fone de ouvido' });
    await expect(linha).toContainText('Lazer · Débito');
    await expect(linha).toContainText('− R$ 1.200,00');
    for (const mes of [m.mes, m.seguinte, m.depois]) {
      await lancamentosDo(page, mes);
      await expect(page.getByRole('listitem').filter({ hasText: 'Fone de ouvido' }), mes).toHaveCount(0);
    }
  });
});

test.describe('sheet de edição no iPhone', () => {
  test('não arrasta para o lado: rola só na vertical e o campo de data cabe na largura', async ({ page, usuario }) => {
    await semearLancamentos(usuario, [{ valor: 4500, categoria: 'Mercado', descricao: 'Feira' }]);
    await entrar(page, usuario);
    await page.getByRole('link', { name: 'Lançamentos' }).click();
    await page.getByRole('button', { name: /Feira/ }).click();
    const sheet = page.getByRole('dialog', { name: 'Editar lançamento' });

    // O iOS desenha o calendário nativo mais largo que a coluna; ele não pode empurrar o sheet.
    const area = sheet.locator('[data-rolagem="sheet"]');
    await expect(area).toHaveCSS('overflow-x', 'hidden');
    await expect(area).toHaveCSS('touch-action', 'pan-y');
    const quando = sheet.getByLabel('Quando');
    await expect(quando).toHaveCSS('min-width', '0px');
    await expect(quando).toHaveCSS('appearance', 'none');
  });
});
