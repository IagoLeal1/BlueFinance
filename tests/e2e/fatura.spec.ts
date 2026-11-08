import { test, expect, entrar, semearCartao, semearLancamentos } from './fixtures';
import { diaDe, mesAtual, nomeDoMes, somarMeses } from '../../src/domain/datas';

const CURTOS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

test.describe('fatura do cartão', () => {
  test('no mês, as compras no crédito ficam juntas na fatura do cartão', async ({ page, usuario }) => {
    const mes = mesAtual();
    const passado = somarMeses(mes, -1);
    const curtoPassado = CURTOS[Number(passado.slice(5)) - 1];
    await semearCartao(usuario, 'Nubank', 3);
    await semearLancamentos(usuario, [
      {
        valor: 40000, categoria: 'Lazer', descricao: 'Fone de ouvido', data: `${passado}-07T12:00:00-03:00`,
        credito: { cartao: 'Nubank', parcela: 1, parcelas: 3, competencia: mes },
      },
      {
        valor: 14830, categoria: 'Mercado', descricao: 'Mercado do mês', data: `${passado}-20T12:00:00-03:00`,
        credito: { cartao: 'Nubank', parcela: 1, parcelas: 1, competencia: mes },
      },
      { valor: 160000, categoria: 'Moradia', descricao: 'Aluguel', forma: 'pix' },
    ]);
    await entrar(page, usuario);
    await page.goto('/lancamentos?ver=credito');

    const fatura = page.getByRole('region', { name: 'Fatura Nubank' });
    await expect(fatura).toContainText('R$ 548,30');
    await expect(fatura).toContainText(`Fecha dia 3 de ${nomeDoMes(mes)}`);
    await expect(fatura.getByRole('listitem').filter({ hasText: 'Fone de ouvido' })).toContainText(`Lazer · 1/3 · comprado em 7 ${curtoPassado}`);
    await expect(fatura.getByRole('listitem').filter({ hasText: 'Mercado do mês' })).toContainText(`Mercado · à vista · 20 ${curtoPassado}`);
    // Cada compra aparece uma vez só (na fatura, não também no dia em que foi comprada).
    await expect(page.getByRole('listitem').filter({ hasText: 'Fone de ouvido' })).toHaveCount(1);

    // Débito e Pix ficam no extrato do Débito, agrupados por dia, fora da fatura.
    await page.getByRole('radiogroup', { name: 'Extrato' }).getByText('Débito', { exact: true }).click();
    const aluguel = page.getByRole('region', { name: /^Hoje/ }).getByRole('listitem').filter({ hasText: 'Aluguel' });
    await expect(aluguel).toContainText('Moradia · Pix');
    await expect(fatura.getByRole('listitem').filter({ hasText: 'Aluguel' })).toHaveCount(0);
  });

  test('o Início mostra a fatura fechada (a pagar) e a aberta de cada cartão', async ({ page, usuario }) => {
    // Fecha dia 1 e vence hoje: a fatura deste mês está fechada e a pagar; a do mês que vem está aberta.
    const mes = mesAtual();
    const dia = Number(diaDe(new Date()).slice(8));
    const fone = (parcela: number) => ({
      valor: 40000, categoria: 'Lazer', descricao: 'Fone de ouvido',
      credito: { cartao: 'Nubank', parcela, parcelas: 3, competencia: somarMeses(mes, parcela), compra: 'fone' },
    });
    await semearCartao(usuario, 'Nubank', 1, dia);
    await semearLancamentos(usuario, [
      { valor: 123456, categoria: 'Outros', descricao: 'Compras antigas', credito: { cartao: 'Nubank', parcela: 1, parcelas: 1, competencia: mes } },
      fone(1), fone(2), fone(3),
      { valor: 12000, categoria: 'Mercado', descricao: 'Feira', credito: { cartao: 'Nubank', parcela: 1, parcelas: 1, competencia: somarMeses(mes, 1) } },
    ]);
    await entrar(page, usuario);

    const cartao = page.getByRole('region', { name: 'Cartão de crédito' });
    const fechada = cartao.getByRole('link', { name: new RegExp(`^Fatura de ${nomeDoMes(mes)}`) });
    await expect(fechada).toContainText(`Fechada · vence dia ${dia}`);
    await expect(fechada).toContainText('R$ 1.234,56');
    const aberta = cartao.getByRole('link', { name: new RegExp(`^Fatura de ${nomeDoMes(somarMeses(mes, 1))}`) });
    await expect(aberta).toContainText('Aberta · fecha dia 1');
    await expect(aberta).toContainText('R$ 520,00');
    await expect(cartao).toContainText(`Mais R$ 800 em parcelas até ${nomeDoMes(somarMeses(mes, 3))}`);

    await aberta.click();
    await expect(page).toHaveURL(new RegExp(`/lancamentos\\?mes=${somarMeses(mes, 1)}&ver=credito$`));
    await expect(page.getByRole('region', { name: 'Fatura Nubank' })).toContainText('R$ 520,00');
  });

  test('fatura fechada sem compras lançadas: lança o total de uma vez', async ({ page, usuario }) => {
    // Fecha dia 1 e vence hoje: a fatura deste mês é a fechada, ainda a pagar, e não tem nada lançado.
    const mes = mesAtual();
    const dia = Number(diaDe(new Date()).slice(8));
    await semearCartao(usuario, 'Nubank', 1, dia);
    await entrar(page, usuario);
    await page.goto('/lancamentos?ver=credito');

    const fatura = page.getByRole('region', { name: 'Fatura Nubank' });
    await expect(fatura).toContainText('R$ 0,00');
    await expect(fatura).toContainText(`Fechou dia 1 · vence dia ${dia}`);
    await fatura.getByRole('button', { name: 'Lançar o total da fatura' }).click();
    const sheet = page.getByRole('dialog', { name: 'Total da fatura' });
    await expect(sheet).toContainText(`Nubank · fatura de ${nomeDoMes(mes)}`);
    await sheet.getByLabel('Valor').pressSequentially('123456');
    await expect(sheet.getByRole('button', { name: 'Fatura' })).toHaveAttribute('aria-pressed', 'true');
    await sheet.getByRole('button', { name: 'Salvar total' }).click();
    await expect(sheet).toBeHidden();

    const linha = fatura.getByRole('listitem').filter({ hasText: `Fatura de ${nomeDoMes(mes)}` });
    await expect(linha).toContainText('− R$ 1.234,56');
    await expect(linha).toContainText('Fatura · à vista');
    // A Fatura tem cor própria, lisa (lilás pastel), diferente do cinza de Outros.
    await expect(linha.locator('span').first()).toHaveCSS('background-color', 'rgb(240, 233, 254)');
    await expect(linha.locator('svg.lucide-credit-card')).toHaveCount(1); // o ícone é o cartão
    await expect(fatura.getByRole('button', { name: 'Lançar o total da fatura' })).toHaveCount(0);

    await page.getByRole('link', { name: 'Início' }).click();
    await expect(page.getByRole('region', { name: 'Cartão de crédito' }).getByRole('link', { name: new RegExp(`^Fatura de ${nomeDoMes(mes)}`) }))
      .toContainText('R$ 1.234,56');
    // Nos gastos por categoria, a fatura sem detalhe aparece separada, como Fatura.
    await expect(page.getByRole('region', { name: 'Gastos por categoria' })).toContainText('Fatura');
  });

  test('sem cartão cadastrado, o Início não mostra o card do cartão', async ({ page, usuario }) => {
    await semearLancamentos(usuario, [{ valor: 5000, categoria: 'Transporte', descricao: 'Ônibus' }]);
    await entrar(page, usuario);
    await expect(page.getByRole('region', { name: 'Últimos' })).toContainText('Ônibus');
    await expect(page.getByRole('region', { name: 'Cartão de crédito' })).toHaveCount(0);
  });
});
