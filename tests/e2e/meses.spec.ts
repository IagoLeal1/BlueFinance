import { test, expect, entrar, semearLancamentos } from './fixtures';
import { mesAtual, nomeDoMes } from '../../src/domain/datas';

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
});
