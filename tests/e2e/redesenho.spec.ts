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

test.describe('redesenho: Início', () => {
  test('o topo mostra o nível de água (sobrou ÷ entrou) e Entrou, Saiu e Investiu sobre a água', async ({ page, usuario }) => {
    await semearLancamentos(usuario, [
      { tipo: 'receita', valor: 100000, categoria: 'Salário', descricao: 'Salário' },
      { valor: 60000, categoria: 'Mercado', descricao: 'Feira' },
    ]);
    await entrar(page, usuario);
    const resumo = page.getByRole('region', { name: /^Resumo de / });
    await expect(resumo.getByText('R$ 400,00')).toBeVisible(); // o saldo conta até o valor certo
    const etiqueta = page.getByText('40% do que entrou');
    await expect(etiqueta).toBeVisible();
    // Água: 76 px de base + 1,1 px por ponto percentual.
    const altura = await etiqueta.evaluate((el) => el.closest<HTMLElement>('[style*="--pct"]')!.getBoundingClientRect().height);
    expect(altura).toBeCloseTo(76 + 40 * 1.1, 0);
    const topo = (await resumo.boundingBox())!;
    for (const nome of ['Entrou', 'Saiu', 'Investiu']) {
      const g = (await resumo.getByRole('group', { name: nome }).boundingBox())!;
      expect(g.y + g.height).toBeLessThanOrEqual(topo.y + topo.height);
    }
  });

  test('sem nada entrar, a água fica no pé e não há etiqueta; a barra de categorias se desenha', async ({ page, usuario }) => {
    await semearLancamentos(usuario, [{ valor: 3290, categoria: 'Mercado', descricao: 'Feira' }]);
    await entrar(page, usuario);
    await expect(page.getByText(/do que entrou/)).toHaveCount(0);
    const segmento = page.getByRole('region', { name: 'Gastos por categoria' }).getByRole('img').locator('span').first();
    expect(await css(segmento, 'animation-name')).toBe('desenha');
  });
});

test.describe('redesenho: folhas', () => {
  test('a folha de novo gasto é de vidro forte, solta das bordas, e o valor se digita pelo teclado dela', async ({ page, usuario }) => {
    await entrar(page, usuario);
    await page.getByRole('button', { name: 'Novo lançamento' }).click();
    const folha = page.getByRole('dialog', { name: 'Novo lançamento' });
    await expect(folha).toBeVisible();
    expect(await css(folha, '-webkit-backdrop-filter')).toContain('blur');
    expect(await css(folha, 'border-top-left-radius')).toBe('44px');
    const caixa = (await folha.boundingBox())!;
    expect(caixa.x).toBeGreaterThanOrEqual(8);

    const valor = folha.getByLabel('Valor');
    await expect(valor).toHaveAttribute('inputmode', 'none'); // o teclado do iPhone não cobre a folha
    const teclado = folha.getByRole('group', { name: 'Teclado' });
    for (const t of ['3', '2', '9', '0']) await teclado.getByRole('button', { name: t, exact: true }).click();
    await expect(valor).toHaveValue('R$ 32,90');
    await teclado.getByRole('button', { name: 'Apagar dígito' }).click();
    await teclado.getByRole('button', { name: '00', exact: true }).click();
    await expect(valor).toHaveValue('R$ 329,00');
    const fechar = (await folha.getByRole('button', { name: 'Fechar' }).boundingBox())!;
    expect(fechar.width).toBeGreaterThanOrEqual(44);

    await folha.getByRole('button', { name: 'Mercado' }).click();
    await folha.getByLabel('Com o quê').fill('Feira');
    await folha.getByRole('button', { name: /^Salvar/ }).click();
    await expect(folha).toBeHidden();
    await expect(page.getByRole('region', { name: 'Últimos' })).toContainText('Feira');
  });
});

test.describe('redesenho: Lançamentos', () => {
  test('o polegar dos extratos desliza até a aba marcada e o vazio é um mar calmo', async ({ page, usuario }) => {
    await entrar(page, usuario);
    await page.getByRole('navigation', { name: 'Principal' }).getByRole('link', { name: 'Lançamentos' }).click();
    await expect(page.getByRole('region', { name: 'Mar calmo por aqui' })).toContainText('Nenhum lançamento neste mês.');

    const extrato = page.getByRole('radiogroup', { name: 'Extrato' });
    const polegar = extrato.locator('span[aria-hidden]').first();
    await extrato.getByText('Crédito', { exact: true }).click();
    await expect(async () => {
      const [p, c] = [await polegar.boundingBox(), await extrato.getByText('Crédito', { exact: true }).boundingBox()];
      expect(Math.abs(p!.x + p!.width / 2 - (c!.x + c!.width / 2))).toBeLessThan(2);
    }).toPass();
    await expect(page.getByRole('region', { name: 'Mar calmo por aqui' })).toContainText('Nenhuma compra no crédito neste mês.');
  });
});

test.describe('redesenho: Ajustes', () => {
  test('a lista agrupada mostra o estado de cada ajuste e cada linha abre a sua subtela, com Voltar', async ({ page, usuario }) => {
    await entrar(page, usuario);
    await page.getByRole('navigation', { name: 'Principal' }).getByRole('link', { name: 'Ajustes' }).click();
    await expect(page.getByRole('link', { name: /^Cartões/ })).toContainText('Nenhum cartão');
    await expect(page.getByRole('link', { name: /^Vale-refeição/ })).toContainText('Não configurado');
    const lancarSozinho = page.getByRole('region', { name: 'Lançar sozinho' });
    await expect(lancarSozinho.getByRole('link')).toHaveText([/^Banco/, /^Apple Pay/, /^Atalho do iPhone/]);
    await expect(page.getByRole('link', { name: /^Atalho do iPhone/ })).toContainText('Sem token');

    await page.getByRole('link', { name: /^Banco/ }).click();
    await expect(page).toHaveURL('/ajustes/banco');
    await expect(page.getByRole('heading', { level: 1, name: 'Banco' })).toBeVisible();
    await page.getByRole('link', { name: 'Voltar' }).click();
    await expect(page).toHaveURL('/ajustes');
  });
});

test.describe('redesenho: Entrar e avisos', () => {
  test('Entrar é o degradê com a água no pé e campos de vidro claro', async ({ page }) => {
    await page.goto('/entrar');
    await expect(page.getByText("Seu dinheiro, na linha d'água.")).toBeVisible();
    expect(await css(page.getByLabel('E-mail'), '-webkit-backdrop-filter')).toContain('blur');
    expect(await css(page.getByRole('main'), 'background-image')).toContain('linear-gradient');
    const botao = (await page.getByRole('button', { name: 'Entrar' }).boundingBox())!;
    expect(botao.height).toBeGreaterThanOrEqual(44);
  });

  test('o aviso de salvo é uma pílula de vidro com Desfazer de 44 pt', async ({ page, usuario }) => {
    await entrar(page, usuario);
    await page.getByRole('button', { name: 'Novo lançamento' }).click();
    const folha = page.getByRole('dialog', { name: 'Novo lançamento' });
    await folha.getByRole('button', { name: 'Mercado' }).click();
    await folha.getByLabel('Valor').pressSequentially('500');
    await folha.getByRole('button', { name: /^Salvar/ }).click();
    const aviso = page.getByRole('status').filter({ hasText: 'Gasto salvo' });
    await expect(aviso).toBeVisible();
    expect(await css(aviso, '-webkit-backdrop-filter')).toContain('blur');
    // Depois de chegar (a pílula entra com a mola viva).
    await expect.poll(async () => (await aviso.getByRole('button', { name: 'Desfazer' }).boundingBox())!.height).toBeGreaterThanOrEqual(44);
  });
});

test.describe('redesenho: Mac', () => {
  test.use({ viewport: { width: 1280, height: 800 }, isMobile: false, hasTouch: false });

  test('a barra de abas vira barra lateral, o Início fica em duas colunas e a folha é um diálogo central', async ({ page, usuario }) => {
    await semearLancamentos(usuario, [{ valor: 3290, categoria: 'Mercado', descricao: 'Feira' }]);
    await entrar(page, usuario);
    const nav = page.getByRole('navigation', { name: 'Principal' });
    const caixas = await nav.getByRole('link').evaluateAll((els) => els.map((e) => e.getBoundingClientRect().toJSON() as DOMRect));
    expect(new Set(caixas.map((c) => Math.round(c.x))).size).toBe(1); // uma embaixo da outra
    expect(caixas[1]!.y).toBeGreaterThan(caixas[0]!.y);
    await expect(page.getByRole('button', { name: 'Novo lançamento' })).toContainText('Novo lançamento');

    const topo = (await page.getByRole('region', { name: /^Resumo de / }).boundingBox())!;
    const ultimos = (await page.getByRole('region', { name: 'Últimos' }).boundingBox())!;
    expect(ultimos.x).toBeGreaterThan(topo.x + topo.width);
    expect(topo.x).toBeGreaterThan(caixas[0]!.x + caixas[0]!.width);

    await page.getByRole('button', { name: 'Novo lançamento' }).click();
    const folha = page.getByRole('dialog', { name: 'Novo lançamento' });
    await expect(folha).toBeVisible();
    await expect.poll(async () => {
      const f = (await folha.boundingBox())!;
      return Math.round(f.x + f.width / 2);
    }).toBe(640);
  });
});

test.describe('redesenho: o motor do Safari', () => {
  test('entende vidro, molas em linear(), color-mix() e a aresta com máscara', async ({ page }) => {
    await page.goto('/entrar');
    const suporte = await page.evaluate(() => ({
      linear: CSS.supports('transition-timing-function', 'linear(0, 0.5, 1)'),
      vidro: CSS.supports('-webkit-backdrop-filter', 'blur(2px)') || CSS.supports('backdrop-filter', 'blur(2px)'),
      colorMix: CSS.supports('color', 'color-mix(in srgb, red 50%, transparent)'),
      maskComposite: CSS.supports('-webkit-mask-composite', 'xor') || CSS.supports('mask-composite', 'exclude'),
    }));
    expect(suporte).toEqual({ linear: true, vidro: true, colorMix: true, maskComposite: true });
  });
});

test.describe('redesenho: o teclado abre no valor', () => {
  test('na edição o teclado começa fechado, abre logo abaixo do valor ao tocar nele e fecha ao ir para outro campo', async ({ page, usuario }) => {
    await semearLancamentos(usuario, [{ valor: 3290, categoria: 'Mercado', descricao: 'Feira' }]);
    await entrar(page, usuario);
    await page.getByRole('navigation', { name: 'Principal' }).getByRole('link', { name: 'Lançamentos' }).click();
    await page.getByRole('button', { name: /Feira/ }).click();
    const folha = page.getByRole('dialog', { name: 'Editar lançamento' });
    const valor = folha.getByLabel('Valor');
    const teclado = folha.getByRole('group', { name: 'Teclado' });
    await expect(teclado).toBeHidden();
    await expect(folha.getByText('Toque no valor para mudar')).toBeVisible();

    await valor.click();
    await expect(teclado).toBeVisible();
    // Logo abaixo do valor: nada entre os dois.
    await expect.poll(async () => {
      const [v, t] = [(await valor.boundingBox())!, (await teclado.boundingBox())!];
      return Math.round(t.y - (v.y + v.height));
    }).toBeLessThan(40);
    for (const t of ['4', '5']) await teclado.getByRole('button', { name: t, exact: true }).click();
    await expect(valor).toHaveValue('R$ 3.290,45');

    await folha.getByRole('button', { name: 'Pronto' }).click();
    await expect(teclado).toBeHidden();
    await valor.click();
    await expect(teclado).toBeVisible();
    await folha.getByLabel('Com o quê').click();
    await expect(teclado).toBeHidden();
  });

  test('no novo lançamento o teclado já vem aberto, embaixo do valor', async ({ page, usuario }) => {
    await entrar(page, usuario);
    await page.getByRole('button', { name: 'Novo lançamento' }).click();
    const folha = page.getByRole('dialog', { name: 'Novo lançamento' });
    const teclado = folha.getByRole('group', { name: 'Teclado' });
    await expect(teclado).toBeVisible();
    const [v, t] = [(await folha.getByLabel('Valor').boundingBox())!, (await teclado.boundingBox())!];
    expect(t.y - (v.y + v.height)).toBeLessThan(40);
  });
});
