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
