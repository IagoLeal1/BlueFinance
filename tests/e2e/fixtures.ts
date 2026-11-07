import { test as base } from '@playwright/test';
import { apagarUsuario, criarUsuario, type Usuario } from '../support/usuarios';

export const test = base.extend<{ usuario: Usuario }>({
  usuario: async ({}, use) => {
    const u = await criarUsuario();
    await use(u);
    await apagarUsuario(u);
  },
});

export { expect } from '@playwright/test';
