import { test, expect, entrar, semearCartao, semearLancamentos } from './fixtures';
import { mesAtual, somarMeses } from '../../src/domain/datas';

const CURTOS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const curto = (mes: string) => CURTOS[Number(mes.slice(5)) - 1];

test.describe('extrato: débito e crédito', () => {
  test('a fatura só sai da conta no vencimento; até lá fica a pagar', async ({ page, usuario }) => {
    // Fecha dia 1 e vence dia 10: a fatura do mês que vem ainda não venceu; a do mês passado já.
    const proximo = somarMeses(mesAtual(), 1);
    const passado = somarMeses(mesAtual(), -1);
    await semearCartao(usuario, 'Nubank', 1, 10);
    await semearLancamentos(usuario, [
      { tipo: 'receita', valor: 500000, categoria: 'Salário', descricao: 'Salário', data: `${proximo}-05T12:00:00-03:00` },
      { valor: 123456, categoria: 'Lazer', descricao: 'Fone', credito: { cartao: 'Nubank', parcela: 1, parcelas: 1, competencia: proximo } },
      { tipo: 'receita', valor: 500000, categoria: 'Salário', descricao: 'Salário', data: `${passado}-05T12:00:00-03:00` },
      { valor: 100000, categoria: 'Lazer', descricao: 'Show', data: `${passado}-02T12:00:00-03:00`, credito: { cartao: 'Nubank', parcela: 1, parcelas: 1, competencia: passado } },
    ]);
    await entrar(page, usuario);

    await page.goto(`/?mes=${proximo}`);
    const resumo = page.getByRole('region', { name: /^Resumo de / });
    await expect(resumo.getByRole('group', { name: 'Saiu' })).toContainText('R$ 0');
    await expect(resumo).toContainText('R$ 5.000,00');
    await expect(resumo).toContainText('Depois da fatura do Nubank (dia 10): R$ 3.765,44');

    await page.goto(`/?mes=${passado}`);
    await expect(resumo.getByRole('group', { name: 'Saiu' })).toContainText('R$ 1.000');
    await expect(resumo).toContainText('R$ 4.000,00');
    await expect(resumo).not.toContainText('Depois da fatura');
  });

  test('Lançamentos: Débito é o extrato da conta; Crédito, as compras do cartão', async ({ page, usuario }) => {
    const proximo = somarMeses(mesAtual(), 1);
    const passado = somarMeses(mesAtual(), -1);
    await semearCartao(usuario, 'Nubank', 1, 10);
    await semearLancamentos(usuario, [
      { valor: 1840, categoria: 'Transporte', descricao: 'Uber', forma: 'pix' },
      { tipo: 'receita', valor: 850000, categoria: 'Salário', descricao: 'Salário' },
      { valor: 40000, categoria: 'Lazer', descricao: 'Fone de ouvido', credito: { cartao: 'Nubank', parcela: 1, parcelas: 1, competencia: proximo } },
      { valor: 100000, categoria: 'Lazer', descricao: 'Show', data: `${passado}-02T12:00:00-03:00`, credito: { cartao: 'Nubank', parcela: 1, parcelas: 1, competencia: passado } },
    ]);
    await entrar(page, usuario);
    await page.getByRole('link', { name: 'Lançamentos' }).click();

    const extrato = page.getByRole('radiogroup', { name: 'Extrato' });
    await expect(extrato.getByRole('radio', { name: 'Débito' })).toBeChecked();
    await expect(page.getByRole('listitem').filter({ hasText: 'Uber' })).toContainText('Transporte · Pix');
    await expect(page.getByRole('listitem').filter({ hasText: 'Salário' })).toContainText('+ R$ 8.500,00');

    // Mês que vem: a fatura está a pagar, numa linha só; tocar nela abre o Crédito daquele mês.
    await page.goto(`/lancamentos?mes=${proximo}`);
    const fatura = page.getByRole('region', { name: 'A pagar' }).getByRole('link', { name: /Fatura Nubank/ });
    await expect(fatura).toContainText(`Crédito · vence 10 ${curto(proximo)}`);
    await expect(fatura).toContainText('− R$ 400,00');
    await expect(page.getByRole('listitem').filter({ hasText: 'Fone de ouvido' })).toHaveCount(0);
    await fatura.click();
    await expect(extrato.getByRole('radio', { name: 'Crédito' })).toBeChecked();
    await expect(page.getByRole('region', { name: 'Fatura Nubank' }).getByRole('listitem').filter({ hasText: 'Fone de ouvido' }))
      .toContainText('− R$ 400,00');

    // Mês passado: a fatura saiu da conta no dia do vencimento.
    await page.goto(`/lancamentos?mes=${passado}`);
    await expect(page.getByRole('region', { name: /^10 / }).getByRole('link', { name: /Fatura Nubank/ })).toContainText('− R$ 1.000,00');
  });
});
