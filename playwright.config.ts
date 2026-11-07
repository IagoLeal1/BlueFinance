import { defineConfig, devices } from '@playwright/test';

const WEB_PORT = 3100; // porta própria para não reaproveitar outro servidor rodando na 3000

export default defineConfig({
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: { trace: 'on-first-retry' },
  projects: [
    // Regras puras (dinheiro, resumo do mês): rodam no runner do Playwright, sem navegador.
    { name: 'unit', testDir: 'tests/unit' },
    // Contrato HTTP que o Atalho do iOS usa: rotas /api do Next, com o Supabase local por trás.
    { name: 'api', testDir: 'tests/api', use: { baseURL: `http://localhost:${WEB_PORT}` } },
    // Jornadas na interface, no motor do Safari com perfil de iPhone 16.
    {
      name: 'e2e-iphone',
      testDir: 'tests/e2e',
      use: { ...devices['iPhone 16'], baseURL: `http://localhost:${WEB_PORT}` },
    },
  ],
  webServer: {
    command: `pnpm next dev --port ${WEB_PORT}`,
    url: `http://localhost:${WEB_PORT}`,
    reuseExistingServer: !process.env.CI,
  },
});
