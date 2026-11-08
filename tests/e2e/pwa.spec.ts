import { test, expect } from '@playwright/test';

test.describe('tela de início do iPhone', () => {
  test('o manifest e o ícone abrem sem login e o app abre em tela cheia', async ({ page, request }) => {
    const manifest = await request.get('/manifest.webmanifest');
    expect(manifest.status()).toBe(200);
    expect(await manifest.json()).toMatchObject({ name: 'BlueFinance', short_name: 'BlueFin', display: 'standalone', start_url: '/' });

    await page.goto('/entrar');
    const icone = await page.locator('link[rel="apple-touch-icon"]').getAttribute('href');
    expect(icone).toBeTruthy();
    const png = await request.get(icone!);
    expect(png.status()).toBe(200);
    expect(png.headers()['content-type']).toContain('image/png');

    // O service worker (aviso da fatura e app sem internet) abre sem login e não fica em cache.
    const sw = await request.get('/sw.js');
    expect(sw.status()).toBe(200);
    expect(sw.headers()['content-type']).toContain('javascript');
    expect(sw.headers()['cache-control']).toContain('no-cache');
  });
});
