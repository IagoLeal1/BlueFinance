import { test, expect, entrar, lancarPeloApp } from './fixtures';
import { clienteDe } from '../support/usuarios';

test.describe('sem internet', () => {
  test('o gasto lançado sem internet fica salvando e sobe quando ela volta', async ({ page, context, usuario }) => {
    await entrar(page, usuario);
    await page.getByRole('link', { name: 'Lançamentos' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Lançamentos' })).toBeVisible();

    await context.setOffline(true);
    await expect(page.getByRole('status').filter({ hasText: 'Sem internet' })).toBeVisible();
    await lancarPeloApp(page, { digitos: '1840', categoria: 'Transporte', descricao: 'Uber' });
    await expect(page.getByRole('region', { name: 'Salvando' }).getByRole('listitem').filter({ hasText: 'Uber' })).toContainText('salvando');

    await context.setOffline(false);
    await expect(page.getByRole('status').filter({ hasText: 'Gasto salvo' })).toBeVisible({ timeout: 20_000 });
    await expect(page.getByRole('region', { name: /^Hoje/ }).getByRole('listitem').filter({ hasText: 'Uber' })).toContainText('− R$ 18,40');
    await expect(page.getByRole('status').filter({ hasText: 'Sem internet' })).toHaveCount(0);
  });

  test('lançado sem internet sobe mesmo se o app for fechado antes, e não duplica', async ({ page, context, usuario }) => {
    await entrar(page, usuario);
    await page.getByRole('link', { name: 'Lançamentos' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Lançamentos' })).toBeVisible();

    await context.setOffline(true);
    await lancarPeloApp(page, { digitos: '4100', categoria: 'Alimentação', descricao: 'Almoço' });
    await page.close();

    await context.setOffline(false);
    const outra = await context.newPage();
    await outra.goto('/lancamentos');
    const almoco = outra.getByRole('region', { name: /^Hoje/ }).getByRole('listitem').filter({ hasText: 'Almoço' });
    await expect(almoco).toContainText('− R$ 41,00', { timeout: 20_000 });
    await outra.reload();
    await expect(almoco).toHaveCount(1);
  });

  test('reenviar um lançamento que já tinha sido salvo não duplica', async ({ page, usuario }) => {
    await entrar(page, usuario);
    await lancarPeloApp(page, { digitos: '3290', categoria: 'Mercado', descricao: 'Feira' });
    await expect(page.getByRole('status').filter({ hasText: 'Gasto salvo' })).toBeVisible();
    const { data } = await clienteDe(usuario).from('lancamentos').select('id');
    // Como se a confirmação tivesse se perdido: o mesmo lançamento volta para a fila do aparelho.
    await page.evaluate((id) => {
      const campos = [['tipo', 'despesa'], ['valor_centavos', '3290'], ['categoria', 'Mercado'], ['forma', 'debito'], ['descricao', 'Feira'], ['id', id]];
      localStorage.setItem('bf:fila', JSON.stringify([{ id, campos, aviso: 'Gasto salvo · reenviado' }]));
    }, data![0]!.id);
    await page.goto('/lancamentos');
    await expect(page.getByRole('status').filter({ hasText: 'Gasto salvo · reenviado' })).toBeVisible();
    await page.reload();
    await expect(page.getByRole('listitem').filter({ hasText: 'Feira' })).toHaveCount(1);
  });
});
