import { test, expect, entrar, semearCartao, semearLancamentos } from './fixtures';
import { mesAtual, nomeDoMes, somarMeses } from '../../src/domain/datas';

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
    await page.getByRole('link', { name: 'Lançamentos' }).click();

    const fatura = page.getByRole('region', { name: 'Fatura Nubank' });
    await expect(fatura).toContainText('R$ 548,30');
    await expect(fatura).toContainText(`Fecha dia 3 de ${nomeDoMes(mes)}`);
    await expect(fatura.getByRole('listitem').filter({ hasText: 'Fone de ouvido' })).toContainText(`Lazer · 1/3 · comprado em 7 ${curtoPassado}`);
    await expect(fatura.getByRole('listitem').filter({ hasText: 'Mercado do mês' })).toContainText(`Mercado · à vista · 20 ${curtoPassado}`);
    // Cada compra aparece uma vez só (na fatura, não também no dia em que foi comprada).
    await expect(page.getByRole('listitem').filter({ hasText: 'Fone de ouvido' })).toHaveCount(1);

    // Débito e Pix seguem agrupados por dia, fora da fatura.
    const aluguel = page.getByRole('region', { name: /^Hoje/ }).getByRole('listitem').filter({ hasText: 'Aluguel' });
    await expect(aluguel).toContainText('Moradia · Pix');
    await expect(fatura.getByRole('listitem').filter({ hasText: 'Aluguel' })).toHaveCount(0);
  });
});
