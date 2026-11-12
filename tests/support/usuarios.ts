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
  /** Despesa à vista: débito (padrão), Pix ou VR. */
  forma?: 'debito' | 'pix' | 'vr';
  /**
   * Parcela de uma compra no crédito, no mês de fatura `competencia` ("2026-12").
   * Parcelas com o mesmo rótulo `compra` são da mesma compra.
   */
  credito?: { cartao: string; parcela: number; parcelas: number | null; competencia: string; compra?: string; recorrente?: boolean };
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
    // Todas as linhas com as mesmas colunas: num insert em lote, coluna que falta vai como null (não como o padrão).
    const base = { user_id: usuario.id, tipo, valor: l.valor, categoria_id: cat.id, descricao: l.descricao, data: l.data ?? new Date().toISOString(), recorrente: false };
    if (!l.credito) return { ...base, ...(l.forma && { forma_pagamento: l.forma }) };
    const cartao = cartoes?.find((c) => c.nome === l.credito!.cartao);
    if (!cartao) throw new Error(`cartão não encontrado: ${l.credito.cartao}`);
    const { parcela, parcelas, competencia, compra, recorrente = false } = l.credito;
    return { ...base, forma_pagamento: 'credito', cartao_id: cartao.id, compra_id: idDaCompra(compra), parcela, parcelas, competencia, recorrente };
  });
  const { error } = await db.from('lancamentos').insert(linhas);
  if (error) throw error;
}

/**
 * Configura o VR do usuário pelo acesso do app (com RLS): quanto cai por mês, o dia e, se houver, o saldo
 * informado em `desde` (padrão: agora), que entra como "Saldo inicial do VR".
 */
export async function semearVr(
  usuario: Usuario,
  { valorMensal, dia, desde = new Date().toISOString(), saldo = 0 }: { valorMensal: number; dia: number; desde?: string; saldo?: number },
) {
  const db = clienteDe(usuario);
  const { error } = await db.from('vr').insert({ user_id: usuario.id, valor_mensal: valorMensal, dia, desde });
  if (error) throw error;
  if (saldo === 0) return;
  const { error: erroSaldo } = await db.from('lancamentos').insert({
    user_id: usuario.id, tipo: 'receita', valor: saldo, descricao: 'Saldo inicial do VR', data: desde, forma_pagamento: 'vr', origem: 'acerto',
  });
  if (erroSaldo) throw erroSaldo;
}

/** Cadastra um cartão de crédito do usuário pelo acesso do app (com RLS). Vencimento padrão: dia 10. */
export async function semearCartao(usuario: Usuario, nome: string, diaFechamento: number, diaVencimento = 10) {
  const { error } = await clienteDe(usuario)
    .from('cartoes')
    .insert({ user_id: usuario.id, nome, dia_fechamento: diaFechamento, dia_vencimento: diaVencimento });
  if (error) throw error;
}

/** Cadastra um investimento do usuário pelo acesso do app (com RLS). Com `cdi`, rende sozinho a esse % do CDI. */
export async function semearInvestimento(
  usuario: Usuario,
  { nome, instituicao, aplicado, cdi }: { nome: string; instituicao: string; aplicado: number; cdi?: { percentual: number; aplicadoEm: string; isentoIr?: boolean } },
) {
  const { data, error } = await clienteDe(usuario)
    .from('investimentos')
    .insert({
      user_id: usuario.id,
      nome,
      tipo: 'Renda fixa',
      instituicao,
      valor_atual: aplicado,
      aportado: aplicado,
      percentual_cdi: cdi?.percentual ?? null,
      aplicado_em: cdi?.aplicadoEm ?? null,
      isento_ir: cdi?.isentoIr ?? false,
    })
    .select('id')
    .single();
  if (error) throw error;
  return data.id;
}

/** Troca todas as taxas do CDI guardadas por estas (% ao dia). Só no Supabase local dos testes. */
export async function semearTaxasCdi(taxas: { dia: string; taxa: number }[]) {
  const apagar = await admin.from('taxas_cdi').delete().gte('dia', '1900-01-01');
  if (apagar.error) throw apagar.error;
  const { error } = await admin.from('taxas_cdi').insert(taxas);
  if (error) throw error;
}
