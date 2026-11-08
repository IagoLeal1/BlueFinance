import { test, expect, entrar, semearCartao, semearLancamentos, type Page } from './fixtures';
import { mesAtual, nomeDoMes, somarMeses } from '../../src/domain/datas';
import { mesDaFatura } from '../../src/domain/parcelas';

/** Abre Lançamentos no mês, no extrato do Crédito (compras no cartão) ou do Débito (a conta). */
const lancamentosDo = (page: Page, mes: string, ver: 'credito' | 'debito' = 'credito') =>
  page.goto(`/lancamentos?ver=${ver}${mes === mesAtual() ? '' : `&mes=${mes}`}`);
const netflix = (page: Page) => page.getByRole('region', { name: 'Fatura Nubank' }).getByRole('listitem').filter({ hasText: 'Netflix' });

test.describe('assinaturas (Todo mês no crédito)', () => {
  test('Todo mês: a assinatura cai em toda fatura a partir da aberta', async ({ page, usuario }) => {
    await semearCartao(usuario, 'Nubank', 3);
    const aberta = mesDaFatura(new Date().toISOString(), 3);
    await entrar(page, usuario);

    await page.getByRole('button', { name: 'Novo lançamento' }).click();
    const sheet = page.getByRole('dialog', { name: 'Novo lançamento' });
    await sheet.getByLabel('Valor').pressSequentially('3990');
    await sheet.getByRole('button', { name: 'Lazer' }).click();
    await sheet.getByRole('radiogroup', { name: 'Como pagou' }).getByText('Crédito', { exact: true }).click();
    await sheet.getByRole('switch', { name: 'Todo mês' }).click();
    await expect(sheet.getByRole('button', { name: 'Mais' })).toHaveCount(0); // sem parcelas
    await expect(sheet.getByText(`Cai todo mês a partir da fatura de ${nomeDoMes(aberta)}`)).toBeVisible();
    await sheet.getByLabel('Com o quê (opcional)').fill('Netflix');
    await sheet.getByRole('button', { name: 'Salvar gasto' }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Assinatura salva' })).toContainText('− R$ 39,90 por mês');

    for (const mes of [aberta, somarMeses(aberta, 1), somarMeses(aberta, 12), somarMeses(aberta, 23)]) {
      await lancamentosDo(page, mes);
      await expect(netflix(page), mes).toContainText('Lazer · todo mês');
      await expect(netflix(page), mes).toContainText('− R$ 39,90');
    }
    // No Início, conta como assinatura (por mês), não como parcelas a vir.
    await page.goto('/');
    const cartao = page.getByRole('region', { name: 'Cartão de crédito' });
    await expect(cartao).toContainText('R$ 39,90 por mês em assinaturas');
    await expect(cartao).not.toContainText('em parcelas');
  });

  test('mudar o valor vale daqui para frente; parar de repetir tira os próximos meses', async ({ page, usuario }) => {
    await semearCartao(usuario, 'Nubank', 3);
    const aberta = mesDaFatura(new Date().toISOString(), 3);
    await semearLancamentos(
      usuario,
      [-1, 0, 1, 2].map((k, i) => ({
        valor: 3990, categoria: 'Lazer', descricao: 'Netflix',
        credito: { cartao: 'Nubank', parcela: i + 1, parcelas: null, competencia: somarMeses(aberta, k), compra: 'netflix', recorrente: true },
      })),
    );
    await entrar(page, usuario);
    await lancamentosDo(page, aberta);

    await netflix(page).click();
    const sheet = page.getByRole('dialog', { name: 'Assinatura' });
    const valor = sheet.getByLabel('Valor');
    for (let i = 0; i < 4; i++) await valor.press('Backspace');
    await valor.pressSequentially('4590');
    await sheet.getByRole('button', { name: 'Salvar alterações' }).click();
    await expect(sheet).toBeHidden();
    await expect(netflix(page)).toContainText('− R$ 45,90');
    await lancamentosDo(page, somarMeses(aberta, -1));
    await expect(netflix(page)).toContainText('− R$ 39,90'); // o que já passou não muda

    await lancamentosDo(page, aberta);
    await netflix(page).click();
    await sheet.getByRole('button', { name: 'Parar de repetir' }).click();
    await sheet.getByRole('button', { name: 'Sim, parar' }).click();
    await expect(sheet).toBeHidden();
    await expect(netflix(page)).toContainText('− R$ 45,90'); // a fatura aberta fica
    await expect(netflix(page)).not.toContainText('todo mês');
    await lancamentosDo(page, somarMeses(aberta, 1));
    await expect(netflix(page)).toHaveCount(0);
  });

  test('o app completa sozinho os próximos meses de uma assinatura', async ({ page, usuario }) => {
    await semearCartao(usuario, 'Nubank', 3);
    const aberta = mesDaFatura(new Date().toISOString(), 3);
    await semearLancamentos(usuario, [
      { valor: 2190, categoria: 'Lazer', descricao: 'Netflix', credito: { cartao: 'Nubank', parcela: 1, parcelas: null, competencia: aberta, compra: 'n', recorrente: true } },
    ]);
    await entrar(page, usuario);
    await lancamentosDo(page, somarMeses(aberta, 6));
    await expect(netflix(page)).toContainText('Lazer · todo mês');
    await expect(netflix(page)).toContainText('− R$ 21,90');
  });
});
