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

/** Abre o sheet pelo botão +, preenche e salva — o caminho de quem lança com o app aberto. */
export async function lancarPeloApp(
  page: Page,
  { tipo = 'Despesa', digitos, categoria, descricao }: { tipo?: string; digitos: string; categoria?: string; descricao: string },
) {
  await page.getByRole('button', { name: 'Novo lançamento' }).click();
  const sheet = page.getByRole('dialog', { name: 'Novo lançamento' });
  await sheet.getByText(tipo, { exact: true }).click();
  await sheet.getByLabel('Valor').pressSequentially(digitos);
  if (categoria) await sheet.getByRole('button', { name: categoria }).click();
  await sheet.getByLabel('Com o quê').fill(descricao);
  await sheet.getByRole('button', { name: /^Salvar/ }).click();
  await sheet.waitFor({ state: 'hidden' });
}

export { expect, type Page } from '@playwright/test';
