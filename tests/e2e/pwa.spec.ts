import { test, expect } from '@playwright/test';

test.describe('tela de início do iPhone', () => {
  test('o manifest e o ícone abrem sem login e o app abre em tela cheia', async ({ page, request }) => {
    const manifest = await request.get('/manifest.webmanifest');
    expect(manifest.status()).toBe(200);
    expect(await manifest.json()).toMatchObject({ name: 'BlueFinance', short_name: 'BlueFinance', display: 'standalone', start_url: '/' });

    await page.goto('/entrar');
    const icone = await page.locator('link[rel="apple-touch-icon"]').getAttribute('href');
    expect(icone).toBeTruthy();
    const png = await request.get(icone!);
    expect(png.status()).toBe(200);
    expect(png.headers()['content-type']).toContain('image/png');
  });
});
