import { test, expect, entrar, semearCartao, semearInvestimento, semearLancamentos } from './fixtures';
import { faturasDoCartao } from '../../src/domain/parcelas';

// O que está na tela (innerText): o valor escondido continua no HTML, só não aparece.
const naTela = { useInnerText: true };

test.describe('olhinho', () => {
  test('esconde o saldo, Entrou/Saiu/Investiu e as faturas no Início; os lançamentos continuam; lembra ao reabrir', async ({ page, usuario }) => {
    const aberta = faturasDoCartao(new Date().toISOString(), 4, 11).aberta;
    await semearCartao(usuario, 'C6bank', 4, 11);
    await semearLancamentos(usuario, [
      { valor: 3290, categoria: 'Mercado', descricao: 'Mercado do bairro' },
      { valor: 41840, categoria: 'Lazer', descricao: 'Tênis', credito: { cartao: 'C6bank', parcela: 1, parcelas: 1, competencia: aberta } },
    ]);
    await entrar(page, usuario);

    const resumo = page.getByRole('region', { name: /^Resumo de / });
    const cartao = page.getByRole('region', { name: 'Cartão de crédito' });
    await expect(resumo).toContainText('R$ 32,90', naTela);
    await expect(cartao).toContainText('R$ 418,40', naTela);

    await page.getByRole('button', { name: 'Esconder valores' }).click();
    await expect(resumo).not.toContainText('32,90', naTela);
    await expect(resumo.getByRole('group', { name: 'Saiu' })).not.toContainText('R$ 33', naTela);
    await expect(cartao).not.toContainText('418,40', naTela);
    await expect(page.getByRole('region', { name: 'Últimos' })).toContainText('R$ 32,90', naTela);

    await page.reload();
    await expect(page.getByRole('region', { name: /^Resumo de / })).not.toContainText('32,90', naTela);
    await expect(page.getByRole('button', { name: 'Mostrar valores' })).toBeVisible();
  });

  test('na aba Investir também; tocar de novo mostra', async ({ page, usuario }) => {
    await semearInvestimento(usuario, { nome: 'CDB', instituicao: 'C6bank', aplicado: 100000 });
    await entrar(page, usuario);
    await page.getByRole('link', { name: 'Investir' }).click();

    const patrimonio = page.getByRole('region', { name: 'Patrimônio investido' });
    const c6 = page.getByRole('region', { name: 'C6bank' });
    await expect(patrimonio).toContainText('R$ 1.000,00', naTela);

    await page.getByRole('button', { name: 'Esconder valores' }).click();
    await expect(patrimonio).not.toContainText('1.000', naTela);
    await expect(c6).not.toContainText('1.000', naTela);
    await expect(c6).toContainText('CDB', naTela);

    await page.getByRole('button', { name: 'Mostrar valores' }).click();
    await expect(patrimonio).toContainText('R$ 1.000,00', naTela);
  });
});
