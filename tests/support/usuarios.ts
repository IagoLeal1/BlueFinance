import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '../../src/lib/supabase/database.types';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
const secretKey = process.env.SUPABASE_SECRET_KEY!;

export const admin = createClient(url, secretKey, { auth: { persistSession: false } });

export interface Usuario {
  id: string;
  email: string;
  senha: string;
  /** Access token da sessão do Supabase, como o app teria depois do login. */
  sessao: string;
}

/** Cria um usuário de teste novo (e-mail confirmado) e já faz login para ter a sessão. */
export async function criarUsuario(): Promise<Usuario> {
  const email = `teste+${randomUUID()}@bluefinance.test`;
  const senha = `senha-${randomUUID()}`;
  const { data, error } = await admin.auth.admin.createUser({ email, password: senha, email_confirm: true });
  if (error) throw error;
  const cliente = createClient(url, publishableKey, { auth: { persistSession: false } });
  const login = await cliente.auth.signInWithPassword({ email, password: senha });
  if (login.error) throw login.error;
  return { id: data.user.id, email, senha, sessao: login.data.session.access_token };
}

export async function apagarUsuario(u: Usuario) {
  await admin.auth.admin.deleteUser(u.id);
}

/** Cliente do Supabase com a sessão do usuário — o mesmo acesso (com RLS) que o app tem. */
export function clienteDe(usuario: Usuario) {
  return createClient<Database>(url, publishableKey, {
    auth: { persistSession: false },
    global: { headers: { Authorization: `Bearer ${usuario.sessao}` } },
  });
}

export interface LancamentoSemente {
  tipo?: 'despesa' | 'receita';
  valor: number;
  categoria: string;
  descricao: string;
  /** ISO 8601; padrão: agora. */
  data?: string;
}

/** Prepara lançamentos do usuário pelo mesmo acesso (com RLS) que o app usa. */
export async function semearLancamentos(usuario: Usuario, lancamentos: LancamentoSemente[]) {
  const db = clienteDe(usuario);
  const { data: categorias } = await db.from('categorias').select('id, nome, tipo');
  const linhas = lancamentos.map((l) => {
    const tipo = l.tipo ?? 'despesa';
    const cat = categorias?.find((c) => c.nome === l.categoria && c.tipo === tipo);
    if (!cat) throw new Error(`categoria não encontrada: ${l.categoria}`);
    return { user_id: usuario.id, tipo, valor: l.valor, categoria_id: cat.id, descricao: l.descricao, data: l.data ?? new Date().toISOString() };
  });
  const { error } = await db.from('lancamentos').insert(linhas);
  if (error) throw error;
}
