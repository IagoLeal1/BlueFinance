import 'server-only';
import { supabaseAdmin } from './supabase-admin';

/**
 * Formas de pagamento do Atalho ("Como pagou?"), como texto para o "Escolher da lista":
 * "Débito", "Pix", "VR" (para quem configurou o VR) e "Crédito · {cartão}". O Atalho devolve o texto escolhido
 * em `forma`.
 */
const DEBITO = 'Débito';
const PIX = 'Pix';
const VR = 'VR';
const PREFIXO_CREDITO = 'Crédito · ';

export type FormaDoAtalho =
  | { forma: 'debito' | 'pix' | 'vr' }
  | { forma: 'credito'; cartao: { id: string; nome: string; diaFechamento: number } };

/** A lista na ordem padrão, com a última forma usada naquela categoria em primeiro. */
export async function formasDoAtalho(userId: string, categoria: string | null): Promise<string[]> {
  const [{ data: cartoes, error }, ultima, comVr] = await Promise.all([
    supabaseAdmin.from('cartoes').select('nome').eq('user_id', userId).order('criado_em'),
    categoria ? ultimaFormaNaCategoria(userId, categoria) : null,
    temVr(userId),
  ]);
  if (error) throw error;
  const todas = [DEBITO, PIX, ...(comVr ? [VR] : []), ...cartoes.map((c) => PREFIXO_CREDITO + c.nome)];
  return ultima && todas.includes(ultima) ? [ultima, ...todas.filter((f) => f !== ultima)] : todas;
}

async function ultimaFormaNaCategoria(userId: string, categoria: string): Promise<string | null> {
  const { data: cat } = await supabaseAdmin
    .from('categorias')
    .select('id')
    .eq('user_id', userId)
    .eq('tipo', 'despesa')
    .eq('nome', categoria)
    .maybeSingle();
  if (!cat) return null;
  const { data: ultimo, error } = await supabaseAdmin
    .from('lancamentos')
    .select('forma_pagamento, cartoes(nome)')
    .eq('user_id', userId)
    .eq('categoria_id', cat.id)
    .not('forma_pagamento', 'is', null)
    .order('data', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!ultimo) return null;
  if (ultimo.forma_pagamento === 'credito') return ultimo.cartoes ? PREFIXO_CREDITO + ultimo.cartoes.nome : null;
  return ultimo.forma_pagamento === 'pix' ? PIX : ultimo.forma_pagamento === 'vr' ? VR : DEBITO;
}

async function temVr(userId: string): Promise<boolean> {
  const { data, error } = await supabaseAdmin.from('vr').select('user_id').eq('user_id', userId).maybeSingle();
  if (error) throw error;
  return !!data;
}

/** Lê a forma que o Atalho mandou. Sem forma é Débito; texto que não é da lista devolve null. */
export async function lerFormaDoAtalho(userId: string, valor: unknown): Promise<FormaDoAtalho | null> {
  if (valor === undefined || valor === null || valor === DEBITO) return { forma: 'debito' };
  if (valor === PIX) return { forma: 'pix' };
  if (valor === VR) return (await temVr(userId)) ? { forma: 'vr' } : null;
  if (typeof valor !== 'string' || !valor.startsWith(PREFIXO_CREDITO)) return null;
  const { data: cartao } = await supabaseAdmin
    .from('cartoes')
    .select('id, nome, dia_fechamento')
    .eq('user_id', userId)
    .eq('nome', valor.slice(PREFIXO_CREDITO.length))
    .order('criado_em')
    .limit(1)
    .maybeSingle();
  return cartao ? { forma: 'credito', cartao: { id: cartao.id, nome: cartao.nome, diaFechamento: cartao.dia_fechamento } } : null;
}
