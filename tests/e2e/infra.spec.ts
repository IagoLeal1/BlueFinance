import { test, expect } from '@playwright/test';

// Checagem de infraestrutura (não é comportamento do app): o servidor sobe e o WebKit abre a página com perfil de iPhone 16.
test('o app abre no WebKit com perfil de iPhone 16', async ({ page }) => {
  await page.goto('/entrar');
  await expect(page).toHaveTitle(/BlueFinance/);
  expect(page.viewportSize()).toEqual({ width: 393, height: 659 });
});
