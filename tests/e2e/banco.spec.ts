import { test, expect, entrar, semearLancamentos, type Page, type Usuario } from './fixtures';
import { admin, clienteDe } from '../support/usuarios';
import { diaAtras, montarPluggy, naPluggy, semearBanco } from '../support/pluggy';

const paraConferir = (page: Page) => page.getByRole('region', { name: 'Para conferir' });
const linhaDoBanco = (page: Page, descricao: string) => paraConferir(page).getByRole('listitem').filter({ hasText: descricao });

/** Coloca transações do banco esperando conferência, como a busca diária deixaria. */
async function semearParaConferir(
  usuario: Usuario,
  itens: { descricao: string; nome: string; valor: number; forma: 'debito' | 'pix'; sugestao: string | null; estabelecimento?: string }[],
) {
  await semearBanco(usuario, `item-${usuario.id}`, diaAtras(1));
  // Já buscado agora: abrir Lançamentos não dispara outra busca.
  await admin.from('bancos').update({ buscado_em: new Date().toISOString(), instituicao: 'C6 Bank', contas: 'Conta e cartão' }).eq('user_id', usuario.id);
  const { data: categorias } = await clienteDe(usuario).from('categorias').select('id, nome').eq('tipo', 'despesa');
  const { error } = await admin.from('transacoes_banco').insert(
    itens.map((t, i) => ({
      user_id: usuario.id,
      pluggy_id: `p-${i}`,
      conta: 'conta',
      tipo: 'despesa',
      forma: t.forma,
      valor: t.valor,
      data: `${diaAtras(0)}T12:00:00-03:00`,
      descricao: t.descricao,
      estabelecimento: t.estabelecimento ?? t.descricao,
      nome: t.nome,
      categoria_id: categorias!.find((c) => c.nome === t.sugestao)?.id ?? null,
    })),
  );
  if (error) throw error;
}

test.describe('Open Finance (Meu Pluggy)', () => {
  test('conecta o banco em Ajustes com o código do Meu Pluggy e já traz o que falta conferir', async ({ page, usuario }) => {
    const itemId = await montarPluggy(
      [
        {
          type: 'BANK',
          name: 'C6 Bank',
          transacoes: [{ id: 't-uber', description: 'UBER *TRIP', amount: -23.7, date: naPluggy(diaAtras(0)), paymentData: { paymentMethod: 'PIX' }, category: 'Taxi and ride-hailing' }],
        },
        { type: 'CREDIT', name: 'C6 Bank Mastercard', transacoes: [] },
      ],
      { consentExpiresAt: '2027-11-17T10:00:00.000Z' },
    );
    await entrar(page, usuario);
    await page.getByRole('link', { name: 'Ajustes' }).click();
    const secao = page.getByRole('region', { name: 'Banco (Open Finance)' });

    await secao.getByLabel('Código da conexão').fill('codigo-errado');
    await secao.getByRole('button', { name: 'Conectar' }).click();
    await expect(secao.getByRole('alert')).toHaveText('Não achei essa conexão na Pluggy. Confira o código (itemId).');

    await secao.getByLabel('Código da conexão').fill(itemId);
    await secao.getByRole('button', { name: 'Conectar' }).click();
    await expect(secao.getByText('C6 Bank', { exact: true })).toBeVisible();
    await expect(secao).toContainText('Conta e cartão · pelo Meu Pluggy');
    await expect(secao).toContainText('Conectado');
    const hoje = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', day: 'numeric', month: 'short', year: 'numeric' })
      .format(new Date())
      .replaceAll(' de ', ' ')
      .replace('.', '');
    await expect(secao.getByRole('listitem').filter({ hasText: 'Importa desde' })).toContainText(hoje);
    await expect(secao.getByRole('listitem').filter({ hasText: 'Autorização vale até' })).toContainText('17 nov 2027');

    await page.getByRole('link', { name: 'Lançamentos' }).click();
    await expect(linhaDoBanco(page, 'UBER *TRIP')).toContainText('− R$ 23,70');
    await expect(linhaDoBanco(page, 'UBER *TRIP')).toContainText('Transporte');
  });

  test('Lançar com a categoria sugerida em um toque; Ignorar tira da lista', async ({ page, usuario }) => {
    await semearParaConferir(usuario, [
      { descricao: 'UBER *TRIP', nome: 'Uber *trip', valor: 2370, forma: 'pix', sugestao: 'Transporte' },
      { descricao: 'PAG*ATACADAO', nome: 'Atacadao', valor: 18740, forma: 'debito', sugestao: 'Mercado' },
    ]);
    await entrar(page, usuario);
    await page.getByRole('link', { name: 'Lançamentos' }).click();
    await expect(paraConferir(page)).toContainText('2 do banco');

    await linhaDoBanco(page, 'UBER *TRIP').getByRole('button', { name: 'Lançar' }).click();
    await expect(linhaDoBanco(page, 'UBER *TRIP')).toHaveCount(0);
    await expect(page.getByRole('button', { name: /Uber \*trip/ })).toContainText('Transporte · Pix · do banco');

    await linhaDoBanco(page, 'PAG*ATACADAO').getByRole('button', { name: 'Ignorar' }).click();
    await expect(paraConferir(page)).toHaveCount(0);
    await expect(page.getByText('Atacadao')).toHaveCount(0);

    // A categoria fica aprendida para o estabelecimento.
    const { data } = await clienteDe(usuario).from('regras_banco').select('estabelecimento, descricao, categorias(nome)');
    expect(data).toEqual([{ estabelecimento: 'UBER *TRIP', descricao: 'Uber *trip', categorias: { nome: 'Transporte' } }]);
  });

  test('tocar na linha abre "Do banco": troca a categoria e o "com o quê" antes de lançar', async ({ page, usuario }) => {
    await semearParaConferir(usuario, [{ descricao: 'PIX ENVIADO JOAO S SILVA', nome: 'Joao S Silva', valor: 5000, forma: 'pix', sugestao: 'Outros' }]);
    await entrar(page, usuario);
    await page.getByRole('link', { name: 'Lançamentos' }).click();

    await linhaDoBanco(page, 'PIX ENVIADO JOAO S SILVA').getByRole('button', { name: /PIX ENVIADO JOAO S SILVA/ }).click();
    const sheet = page.getByRole('dialog', { name: 'Do banco' });
    await expect(sheet).toContainText('R$ 50,00');
    await expect(sheet.getByLabel('Com o quê')).toHaveValue('Joao S Silva');
    await sheet.getByRole('button', { name: 'Lazer' }).click();
    await sheet.getByLabel('Com o quê').fill('Futebol');
    await expect(sheet).toContainText('Da próxima vez, PIX ENVIADO JOAO S SILVA entra sozinho em Lazer.');
    await sheet.getByRole('button', { name: 'Lançar' }).click();
    await expect(sheet).toBeHidden();
    await expect(paraConferir(page)).toHaveCount(0);
    await expect(page.getByRole('button', { name: /Futebol/ })).toContainText('Lazer · Pix · do banco');
  });

  test('o que bateu com o banco aparece com "✓ banco"', async ({ page, usuario }) => {
    await semearLancamentos(usuario, [{ valor: 3290, categoria: 'Alimentação', descricao: 'Almoço' }]);
    await semearBanco(usuario, `item-${usuario.id}`, diaAtras(0));
    await admin.from('bancos').update({ buscado_em: new Date().toISOString() }).eq('user_id', usuario.id);
    const { data: almoco } = await clienteDe(usuario).from('lancamentos').select('id').single();
    await admin.from('transacoes_banco').insert({
      user_id: usuario.id, pluggy_id: 'p', conta: 'conta', tipo: 'despesa', forma: 'debito', valor: 3290, data: new Date().toISOString(),
      descricao: 'RESTAURANTE', estabelecimento: 'RESTAURANTE', situacao: 'conferido', lancamento_id: almoco!.id,
    });
    await entrar(page, usuario);
    await page.getByRole('link', { name: 'Lançamentos' }).click();
    await expect(page.getByRole('button', { name: /Almoço/ })).toContainText('Alimentação · Débito · ✓ banco');
  });
});
