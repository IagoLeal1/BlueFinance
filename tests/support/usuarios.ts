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
  /** Despesa à vista: débito (padrão) ou Pix. */
  forma?: 'debito' | 'pix';
  /**
   * Parcela de uma compra no crédito, no mês de fatura `competencia` ("2026-12").
   * Parcelas com o mesmo rótulo `compra` são da mesma compra.
   */
  credito?: { cartao: string; parcela: number; parcelas: number; competencia: string; compra?: string };
}

/** Prepara lançamentos do usuário pelo mesmo acesso (com RLS) que o app usa. */
export async function semearLancamentos(usuario: Usuario, lancamentos: LancamentoSemente[]) {
  const db = clienteDe(usuario);
  const [{ data: categorias }, { data: cartoes }] = await Promise.all([
    db.from('categorias').select('id, nome, tipo'),
    db.from('cartoes').select('id, nome'),
  ]);
  const compras = new Map<string, string>();
  const idDaCompra = (rotulo?: string) => {
    if (!rotulo) return crypto.randomUUID();
    if (!compras.has(rotulo)) compras.set(rotulo, crypto.randomUUID());
    return compras.get(rotulo)!;
  };
  const linhas = lancamentos.map((l) => {
    const tipo = l.tipo ?? 'despesa';
    const cat = categorias?.find((c) => c.nome === l.categoria && c.tipo === tipo);
    if (!cat) throw new Error(`categoria não encontrada: ${l.categoria}`);
    const base = { user_id: usuario.id, tipo, valor: l.valor, categoria_id: cat.id, descricao: l.descricao, data: l.data ?? new Date().toISOString() };
    if (!l.credito) return { ...base, ...(l.forma && { forma_pagamento: l.forma }) };
    const cartao = cartoes?.find((c) => c.nome === l.credito!.cartao);
    if (!cartao) throw new Error(`cartão não encontrado: ${l.credito.cartao}`);
    const { parcela, parcelas, competencia, compra } = l.credito;
    return { ...base, forma_pagamento: 'credito', cartao_id: cartao.id, compra_id: idDaCompra(compra), parcela, parcelas, competencia };
  });
  const { error } = await db.from('lancamentos').insert(linhas);
  if (error) throw error;
}

/** Cadastra um cartão de crédito do usuário pelo acesso do app (com RLS). Vencimento padrão: dia 10. */
export async function semearCartao(usuario: Usuario, nome: string, diaFechamento: number, diaVencimento = 10) {
  const { error } = await clienteDe(usuario)
    .from('cartoes')
    .insert({ user_id: usuario.id, nome, dia_fechamento: diaFechamento, dia_vencimento: diaVencimento });
  if (error) throw error;
}
