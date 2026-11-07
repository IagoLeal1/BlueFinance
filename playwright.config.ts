import { defineConfig, devices } from '@playwright/test';

const WEB_PORT = 5173;

export default defineConfig({
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: { trace: 'on-first-retry' },
  projects: [
    // Regras puras (dinheiro, resumo do mês): rodam no runner do Playwright, sem navegador.
    { name: 'unit', testDir: 'tests/unit' },
    // Contrato HTTP que o Atalho do iOS usa. Roda contra o Supabase local.
    {
      name: 'api',
      testDir: 'tests/api',
      use: { baseURL: process.env.SUPABASE_URL ?? 'http://127.0.0.1:54321' },
    },
    // Jornadas na interface, no motor do Safari com perfil de iPhone 16.
    {
      name: 'e2e-iphone',
      testDir: 'tests/e2e',
      use: { ...devices['iPhone 16'], baseURL: `http://localhost:${WEB_PORT}` },
    },
  ],
  webServer: {
    command: `pnpm vite --port ${WEB_PORT} --strictPort`,
    url: `http://localhost:${WEB_PORT}`,
    reuseExistingServer: !process.env.CI,
  },
});
