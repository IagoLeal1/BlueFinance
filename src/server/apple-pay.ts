import 'server-only';
import { formaDoCartao, type FormaDaCarteira } from '@/domain/apple-pay';
import { escolherCartao } from '@/domain/banco';
import { supabaseServidor } from '@/lib/supabase/server';
import { supabaseAdmin } from './supabase-admin';

export type PagamentoDaCarteira =
  | { forma: 'debito' | 'vr'; cartao: null }
  | { forma: 'credito'; cartao: { id: string; nome: string; diaFechamento: number } };

/**
 * Como um cartão da Carteira entra (Ajustes › Apple Pay). Visto pela primeira vez, ele é guardado com a forma
 * adivinhada pelo nome ("Crédito" → crédito no cartão do app de nome parecido; vale-refeição → VR; senão débito).
 * Crédito sem cartão no app, ou VR sem VR configurado, entra como débito.
 */
export async function pagamentoDoCartao(userId: string, nome: string): Promise<PagamentoDaCarteira> {
  const db = supabaseAdmin;
  const [{ data: salvo }, { data: cartoes }, { data: vr }] = await Promise.all([
    db.from('cartoes_carteira').select('forma, cartao_id').eq('user_id', userId).eq('nome', nome).maybeSingle(),
    db.from('cartoes').select('id, nome, dia_fechamento').eq('user_id', userId).order('criado_em'),
    db.from('vr').select('user_id').eq('user_id', userId).maybeSingle(),
  ]);
  const doApp = (cartoes ?? []).map((c) => ({ id: c.id, nome: c.nome, diaFechamento: c.dia_fechamento }));
  let forma: FormaDaCarteira = (salvo?.forma as FormaDaCarteira | undefined) ?? formaDoCartao(nome);
  let cartao = forma === 'credito' ? (doApp.find((c) => c.id === salvo?.cartao_id) ?? escolherCartao(doApp, nome)) : null;
  if (!salvo) {
    await db
      .from('cartoes_carteira')
      .upsert({ user_id: userId, nome, forma, cartao_id: cartao?.id ?? null }, { onConflict: 'user_id,nome', ignoreDuplicates: true });
  }
  if (forma === 'credito' && !cartao) forma = 'debito';
  if (forma === 'vr' && !vr) forma = 'debito';
  if (forma !== 'credito') cartao = null;
  return forma === 'credito' ? { forma, cartao: cartao! } : { forma, cartao: null };
}

export interface CartaoDaCarteira {
  nome: string;
  forma: FormaDaCarteira;
  cartaoId: string | null;
}

/** Cartões da Carteira do usuário logado, na ordem em que apareceram (Ajustes › Apple Pay). */
export async function cartoesDaCarteira(): Promise<CartaoDaCarteira[]> {
  const supabase = await supabaseServidor();
  const { data, error } = await supabase.from('cartoes_carteira').select('nome, forma, cartao_id').order('criado_em');
  if (error) throw error;
  return data.map((c) => ({ nome: c.nome, forma: c.forma as FormaDaCarteira, cartaoId: c.cartao_id }));
}

export interface ApplePayAConfirmar {
  id: string;
  valor: number;
  data: string;
  descricao: string;
  forma: FormaDaCarteira;
  cartao: string | null;
  categoria: { id: string; nome: string; icone: string } | null;
}

/** Gastos do Apple Pay em lugar novo, esperando você confirmar a categoria e o nome (Para conferir). */
export async function applePayAConfirmar(): Promise<ApplePayAConfirmar[]> {
  const supabase = await supabaseServidor();
  const { data, error } = await supabase
    .from('lancamentos')
    .select('id, valor, data, descricao, forma_pagamento, categorias(id, nome, icone), cartoes(nome)')
    .eq('a_confirmar', true)
    .order('data', { ascending: false });
  if (error) throw error;
  return data.map((l) => ({
    id: l.id,
    valor: l.valor,
    data: l.data,
    descricao: l.descricao,
    forma: (l.forma_pagamento as FormaDaCarteira | null) ?? 'debito',
    cartao: l.cartoes?.nome ?? null,
    categoria: l.categorias,
  }));
}
