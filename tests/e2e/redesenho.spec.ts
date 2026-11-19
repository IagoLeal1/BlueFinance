import { test, expect, entrar, semearLancamentos, type Page } from './fixtures';
import type { Locator } from '@playwright/test';

/** Valor calculado de uma propriedade CSS (com pseudo-elemento opcional). */
const css = (alvo: Locator, prop: string, pseudo?: string) =>
  alvo.evaluate((el, [p, ps]) => getComputedStyle(el, ps || null).getPropertyValue(p!), [prop, pseudo ?? '']);
const token = (page: Page, nome: string) =>
  page.evaluate((n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim(), nome);

test.describe('redesenho: base (Liquid Glass)', () => {
  test('texto em SF Pro pela pilha do sistema e valores em SF Pro Rounded; a Manrope saiu', async ({ page, usuario }) => {
    await entrar(page, usuario);
    expect(await css(page.locator('body'), 'font-family')).toMatch(/^-apple-system/);
    expect(await page.content()).not.toMatch(/manrope/i);
    const sobrou = page.getByRole('region', { name: /^Resumo de / }).getByText('R$ 0,00');
    expect(await css(sobrou, 'font-family')).toMatch(/^ui-rounded/);
  });

  test('fundo fixo com profundidade e cartões em vidro', async ({ page, usuario }) => {
    await semearLancamentos(usuario, [{ valor: 3290, categoria: 'Mercado', descricao: 'Feira' }]);
    await entrar(page, usuario);
    const body = page.locator('body');
    expect(await css(body, 'position', '::before')).toBe('fixed');
    expect(await css(body, 'background-image', '::before')).toContain('radial-gradient');
    const cartao = page.getByRole('region', { name: 'Gastos por categoria' });
    expect(await css(cartao, '-webkit-backdrop-filter')).toContain('blur');
  });

  test('investimento em Água e âmbar só para alerta, nos dois temas', async ({ page, usuario }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await entrar(page, usuario);
    expect(await token(page, '--invest')).toBe('#0b7a74');
    expect(await token(page, '--alert')).toBe('#855700');
    await page.emulateMedia({ colorScheme: 'dark' });
    expect(await token(page, '--invest')).toBe('#4fd8cf');
    expect(await token(page, '--alert')).toBe('#f0b54a');
  });

  test('molas entregues como linear()', async ({ page, usuario }) => {
    await entrar(page, usuario);
    for (const m of ['agil', 'viva', 'calma']) expect(await token(page, `--ease-${m}`)).toMatch(/^linear\(0, /);
  });
});

test.describe('redesenho: barra de abas e topo', () => {
  test('quatro abas de largura igual, rótulo de 9 pt, lente sob a aba ativa e o + redondo à direita', async ({ page, usuario }) => {
    await entrar(page, usuario);
    const nav = page.getByRole('navigation', { name: 'Principal' });
    const abas = nav.getByRole('link');
    await expect(abas).toHaveCount(4);
    const larguras = await abas.evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().width)));
    expect(new Set(larguras).size).toBe(1);
    expect(await css(abas.first(), 'font-size')).toBe('9px');

    const mais = page.getByRole('button', { name: 'Novo lançamento' });
    const [caixaNav, caixaMais] = [await nav.boundingBox(), await mais.boundingBox()];
    expect(caixaMais!.x).toBeGreaterThan(caixaNav!.x + caixaNav!.width - 1);
    expect(caixaMais!.width).toBeGreaterThanOrEqual(44);
    expect(await css(mais, 'border-radius')).toMatch(/px/);
    expect(await css(mais, '-webkit-backdrop-filter')).toContain('blur');

    // A lente acompanha a aba: vai para Investir ao tocar.
    const lente = nav.locator('.lente-aba');
    await nav.getByRole('link', { name: 'Investir' }).click();
    await expect(page).toHaveURL('/investimentos');
    await expect(async () => {
      const [l, a] = [await lente.boundingBox(), await nav.getByRole('link', { name: 'Investir' }).boundingBox()];
      expect(Math.abs(l!.x + l!.width / 2 - (a!.x + a!.width / 2))).toBeLessThan(2);
    }).toPass();
  });

  test('olhinho e mês flutuam no topo em vidro; o mês abre um menu', async ({ page, usuario }) => {
    await entrar(page, usuario);
    const olho = page.getByRole('button', { name: 'Esconder valores' });
    const caixa = await olho.boundingBox();
    expect(caixa!.width).toBeGreaterThanOrEqual(44);
    expect(caixa!.height).toBeGreaterThanOrEqual(44);
    // Sobre o degradê, vidro claro com ícone branco.
    expect(await css(olho, 'color')).toBe('rgb(255, 255, 255)');

    const mes = page.getByRole('button', { name: /^Trocar mês/ });
    await expect(mes).toHaveText(/^[a-z]{3}$/);
    await mes.click();
    const menu = page.getByRole('menu', { name: 'Escolher mês' });
    await expect(menu).toBeVisible();
    expect(await css(menu, '-webkit-backdrop-filter')).toContain('blur');
    await expect(menu.locator('[role="menuitem"][aria-current="page"]')).toHaveCount(1);
  });
});
