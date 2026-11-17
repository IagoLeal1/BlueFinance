import { test, expect, entrar, semearCartao, type Page, type Usuario } from './fixtures';
import { clienteDe } from '../support/usuarios';

const paraConferir = (page: Page) => page.getByRole('region', { name: 'Para conferir' });
const linhaDoApplePay = (page: Page, descricao: string) => paraConferir(page).getByRole('listitem').filter({ hasText: descricao });

/** Um gasto do Apple Pay em lugar novo, como a rota /api/apple-pay deixaria: já conta no mês, "a confirmar". */
async function semearApplePay(usuario: Usuario, { descricao, valor }: { descricao: string; valor: number }) {
  const db = clienteDe(usuario);
  const { data: outros } = await db.from('categorias').select('id').eq('nome', 'Outros').single();
  const { error } = await db.from('lancamentos').insert({
    user_id: usuario.id,
    tipo: 'despesa',
    valor,
    categoria_id: outros!.id,
    descricao,
    forma_pagamento: 'debito',
    origem: 'applepay',
    a_confirmar: true,
    estabelecimento: descricao.toUpperCase(),
  });
  if (error) throw error;
}

const regras = async (usuario: Usuario) =>
  (await clienteDe(usuario).from('regras_banco').select('estabelecimento, descricao, categorias(nome)')).data;

test.describe('Apple Pay', () => {
  test('lugar novo: Confirmar em um toque mantém a categoria e ensina o lugar', async ({ page, usuario }) => {
    await semearApplePay(usuario, { descricao: 'Padaria Real', valor: 850 });
    await entrar(page, usuario);
    await page.getByRole('link', { name: 'Lançamentos' }).click();
    await expect(linhaDoApplePay(page, 'Padaria Real')).toContainText('Apple Pay');
    await expect(linhaDoApplePay(page, 'Padaria Real')).toContainText('Outros');
    // Já conta no mês: aparece na lista do dia, marcado "a confirmar".
    await expect(page.getByRole('button', { name: /Padaria Real.*a confirmar/ })).toBeVisible();

    await linhaDoApplePay(page, 'Padaria Real').getByRole('button', { name: 'Confirmar' }).click();
    await expect(paraConferir(page)).toHaveCount(0);
    await expect(page.getByRole('button', { name: /Padaria Real/ })).toContainText('Outros · Débito · Apple Pay');
    await expect(page.getByRole('button', { name: /Padaria Real/ })).not.toContainText('a confirmar');
    expect(await regras(usuario)).toEqual([{ estabelecimento: 'PADARIA REAL', descricao: 'Padaria Real', categorias: { nome: 'Outros' } }]);
  });

  test('tocar na linha abre "Do Apple Pay": troca a categoria e o nome antes de confirmar', async ({ page, usuario }) => {
    await semearApplePay(usuario, { descricao: 'Padaria Real', valor: 850 });
    await entrar(page, usuario);
    await page.getByRole('link', { name: 'Lançamentos' }).click();

    await linhaDoApplePay(page, 'Padaria Real').getByRole('button', { name: /Padaria Real/ }).click();
    const sheet = page.getByRole('dialog', { name: 'Do Apple Pay' });
    await expect(sheet).toContainText('R$ 8,50');
    await sheet.getByRole('button', { name: 'Alimentação' }).click();
    await sheet.getByLabel('Com o quê').fill('Pão');
    await expect(sheet).toContainText('Da próxima vez, Padaria Real entra sozinho em Alimentação.');
    await sheet.getByRole('button', { name: 'Confirmar' }).click();
    await expect(sheet).toBeHidden();
    await expect(paraConferir(page)).toHaveCount(0);
    await expect(page.getByRole('button', { name: /Pão/ })).toContainText('Alimentação · Débito · Apple Pay');
    expect(await regras(usuario)).toEqual([{ estabelecimento: 'PADARIA REAL', descricao: 'Pão', categorias: { nome: 'Alimentação' } }]);
  });

  test('Ajustes › Apple Pay: escolhe como cada cartão da Carteira entra', async ({ page, usuario }) => {
    await semearCartao(usuario, 'C6bank', 4, 11);
    await entrar(page, usuario);
    await page.getByRole('link', { name: 'Ajustes' }).click();
    const secao = page.getByRole('region', { name: 'Apple Pay' });
    await expect(secao).toContainText('Nenhum cartão ainda');

    await clienteDe(usuario).from('cartoes_carteira').insert({ user_id: usuario.id, nome: 'C6 Bank', forma: 'debito' });
    await page.reload();
    const c6 = secao.getByRole('radiogroup', { name: 'C6 Bank' });
    await expect(c6.getByRole('radio', { name: 'Débito' })).toBeChecked();
    await c6.getByText('Crédito', { exact: true }).click();
    await expect(c6.getByRole('radio', { name: 'Crédito' })).toBeChecked();
    await expect
      .poll(async () => (await clienteDe(usuario).from('cartoes_carteira').select('forma, cartoes(nome)').single()).data)
      .toEqual({ forma: 'credito', cartoes: { nome: 'C6bank' } });
    await page.reload();
    await expect(secao.getByRole('radiogroup', { name: 'C6 Bank' }).getByRole('radio', { name: 'Crédito' })).toBeChecked();
  });
});
