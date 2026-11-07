import { test as base, type APIRequestContext } from '@playwright/test';
import { apagarUsuario, criarUsuario, type Usuario } from '../support/usuarios';

export { clienteDe, type Usuario } from '../support/usuarios';

/** Cada teste ganha usuários novos, apagados no fim — testes não dependem uns dos outros. */
export const test = base.extend<{ usuario: Usuario; outroUsuario: Usuario }>({
  usuario: async ({}, use) => {
    const u = await criarUsuario();
    await use(u);
    await apagarUsuario(u);
  },
  outroUsuario: async ({}, use) => {
    const u = await criarUsuario();
    await use(u);
    await apagarUsuario(u);
  },
});

/** Gera um token pessoal pelo mesmo caminho do app (POST /api/tokens com a sessão). */
export async function tokenDe(request: APIRequestContext, usuario: Usuario): Promise<string> {
  const res = await request.post('/api/tokens', { headers: { Authorization: `Bearer ${usuario.sessao}` } });
  if (res.status() !== 201) throw new Error(`não gerou token: ${res.status()}`);
  return (await res.json()).token;
}

export { expect } from '@playwright/test';
