import { test, expect, entrar, semearCartao, semearLancamentos } from './fixtures';
import { mesAtual, nomeDoMes, somarMeses } from '../../src/domain/datas';

function mesAnterior(): string {
  const [ano, mes] = mesAtual().split('-').map(Number) as [number, number];
  return mes === 1 ? `${ano - 1}-12` : `${ano}-${String(mes - 1).padStart(2, '0')}`;
}
const capitalizar = (s: string) => s[0]!.toUpperCase() + s.slice(1);

test.describe('trocar de mês', () => {
  test('mostra o resumo e os lançamentos do mês escolhido', async ({ page, usuario }) => {
    const anterior = mesAnterior();
    const nome = capitalizar(nomeDoMes(anterior));
    await semearLancamentos(usuario, [{ valor: 12000, categoria: 'Lazer', descricao: 'Show', data: `${anterior}-15T12:00:00-03:00` }]);
    await entrar(page, usuario);
    await expect(page.getByText('Nenhum lançamento ainda.')).toBeVisible(); // mês atual vazio

    await page.getByRole('button', { name: 'Trocar mês' }).click();
    await page.getByRole('dialog', { name: 'Escolher mês' }).getByRole('link', { name: new RegExp(`^${nome}`) }).click();

    await expect(page.getByRole('heading', { level: 1 })).toContainText(nome);
    await expect(page.getByRole('region', { name: /^Resumo de / }).getByRole('group', { name: 'Saiu' })).toContainText('R$ 120');
    await expect(page.getByRole('region', { name: 'Últimos' })).toContainText('Show');

    await page.getByRole('region', { name: 'Últimos' }).getByRole('link', { name: 'Ver todos' }).click();
    await expect(page.getByRole('heading', { level: 1 })).toContainText(`Lançamentos · ${nome}`);
    await expect(page.getByRole('listitem').filter({ hasText: 'Show' })).toContainText('− R$ 120,00');
  });

  test('mostra no seletor os meses à frente que têm parcelas', async ({ page, usuario }) => {
    const futuro = somarMeses(mesAtual(), 2);
    const nome = capitalizar(nomeDoMes(futuro));
    await semearCartao(usuario, 'Nubank', 3);
    await semearLancamentos(usuario, [
      { valor: 25000, categoria: 'Lazer', descricao: 'Viagem', credito: { cartao: 'Nubank', parcela: 3, parcelas: 3, competencia: futuro } },
    ]);
    await entrar(page, usuario);
    await page.getByRole('link', { name: 'Lançamentos' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Lançamentos' })).toBeVisible();

    await page.getByRole('button', { name: 'Trocar mês' }).click();
    await page.getByRole('dialog', { name: 'Escolher mês' }).getByRole('link', { name: `${nome} de ${futuro.slice(0, 4)}` }).click();
    await expect(page.getByRole('heading', { level: 1 })).toContainText(`Lançamentos · ${nome}`);
    await page.getByRole('radiogroup', { name: 'Extrato' }).getByText('Crédito', { exact: true }).click();
    await expect(page.getByRole('region', { name: 'Fatura Nubank' }).getByRole('listitem').filter({ hasText: 'Viagem' })).toContainText('3/3');

    // O mês atual continua levando para a página sem ?mes.
    await page.getByRole('button', { name: 'Trocar mês' }).click();
    await page.getByRole('dialog', { name: 'Escolher mês' }).getByRole('link', { name: new RegExp(`^${capitalizar(nomeDoMes(mesAtual()))}`) }).click();
    await expect(page).toHaveURL(/\/lancamentos$/);
  });
});
