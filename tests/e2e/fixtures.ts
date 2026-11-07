import { test as base, type Page } from '@playwright/test';
import { apagarUsuario, criarUsuario, type Usuario } from '../support/usuarios';

export const test = base.extend<{ usuario: Usuario }>({
  usuario: async ({}, use) => {
    const u = await criarUsuario();
    await use(u);
    await apagarUsuario(u);
  },
});

/** Entra pelo formulário, como você faria no iPhone, e espera a tela Início. */
export async function entrar(page: Page, usuario: Usuario) {
  await page.goto('/entrar');
  await page.getByLabel('E-mail').fill(usuario.email);
  await page.getByLabel('Senha').fill(usuario.senha);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await page.waitForURL('/');
}

export { expect } from '@playwright/test';
