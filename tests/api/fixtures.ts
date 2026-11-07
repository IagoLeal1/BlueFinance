import { randomUUID } from 'node:crypto';
import { test as base, type APIRequestContext } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
const secretKey = process.env.SUPABASE_SECRET_KEY!;

const admin = createClient(url, secretKey, { auth: { persistSession: false } });

export interface Usuario {
  id: string;
  email: string;
  /** Access token da sessão do Supabase, como o app teria depois do login. */
  sessao: string;
}

async function criarUsuario(): Promise<Usuario> {
  const email = `teste+${randomUUID()}@bluefinance.test`;
  const password = `senha-${randomUUID()}`;
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (error) throw error;
  const cliente = createClient(url, publishableKey, { auth: { persistSession: false } });
  const login = await cliente.auth.signInWithPassword({ email, password });
  if (login.error) throw login.error;
  return { id: data.user.id, email, sessao: login.data.session.access_token };
}

/** Cada teste ganha usuários novos, apagados no fim — testes não dependem uns dos outros. */
export const test = base.extend<{ usuario: Usuario; outroUsuario: Usuario }>({
  usuario: async ({}, use) => {
    const u = await criarUsuario();
    await use(u);
    await admin.auth.admin.deleteUser(u.id);
  },
  outroUsuario: async ({}, use) => {
    const u = await criarUsuario();
    await use(u);
    await admin.auth.admin.deleteUser(u.id);
  },
});

/** Cliente do Supabase com a sessão do usuário — o mesmo acesso (com RLS) que o app tem. */
export function clienteDe(usuario: Usuario) {
  return createClient(url, publishableKey, {
    auth: { persistSession: false },
    global: { headers: { Authorization: `Bearer ${usuario.sessao}` } },
  });
}

/** Gera um token pessoal pelo mesmo caminho do app (POST /api/tokens com a sessão). */
export async function tokenDe(request: APIRequestContext, usuario: Usuario): Promise<string> {
  const res = await request.post('/api/tokens', { headers: { Authorization: `Bearer ${usuario.sessao}` } });
  if (res.status() !== 201) throw new Error(`não gerou token: ${res.status()}`);
  return (await res.json()).token;
}

export { expect } from '@playwright/test';
