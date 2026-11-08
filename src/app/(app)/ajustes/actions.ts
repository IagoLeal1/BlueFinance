'use server';

import { refresh } from 'next/cache';
import { redirect } from 'next/navigation';
import { supabaseServidor } from '@/lib/supabase/server';
import { criarTokenPessoal } from '@/server/tokens';

export interface EstadoToken {
  token?: string;
  erro?: string;
}

/** Gera o token do Atalho para quem está logado. O token volta só nesta resposta. */
export async function gerarToken(): Promise<EstadoToken> {
  const supabase = await supabaseServidor();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims.sub;
  if (!userId) return { erro: 'Sua sessão expirou. Entre de novo.' };
  const token = await criarTokenPessoal(userId);
  refresh();
  return { token };
}

export async function sair() {
  const supabase = await supabaseServidor();
  await supabase.auth.signOut();
  redirect('/entrar');
}

export interface EstadoCartao {
  ok?: boolean;
  erro?: string;
}

/** Cria (sem id) ou altera (com id) um cartão de crédito: nome e dia em que a fatura fecha. */
export async function salvarCartao(_anterior: EstadoCartao, form: FormData): Promise<EstadoCartao> {
  const id = String(form.get('id') ?? '');
  const nome = String(form.get('nome') ?? '').trim();
  const dia = Number(form.get('dia_fechamento'));
  const vence = Number(form.get('dia_vencimento'));
  if (!nome) return { erro: 'Dê um nome ao cartão.' };
  if (!Number.isInteger(dia) || dia < 1 || dia > 31) return { erro: 'Escolha o dia de fechamento (1 a 31).' };
  if (!Number.isInteger(vence) || vence < 1 || vence > 31) return { erro: 'Escolha o dia do vencimento (1 a 31).' };

  const supabase = await supabaseServidor();
  if (id) {
    const { data, error } = await supabase.from('cartoes').update({ nome, dia_fechamento: dia, dia_vencimento: vence }).eq('id', id).select('id');
    if (error || !data?.length) return { erro: 'Não foi possível salvar. Tente de novo.' };
  } else {
    const { data } = await supabase.auth.getClaims();
    const userId = data?.claims.sub;
    if (!userId) return { erro: 'Sua sessão expirou. Entre de novo.' };
    const { error } = await supabase.from('cartoes').insert({ user_id: userId, nome, dia_fechamento: dia, dia_vencimento: vence });
    if (error) return { erro: 'Não foi possível salvar. Tente de novo.' };
  }
  refresh();
  return { ok: true };
}

/** Exclui um cartão. Lançamentos dele continuam, só perdem a ligação com o cartão. */
export async function excluirCartao(_anterior: EstadoCartao, form: FormData): Promise<EstadoCartao> {
  const supabase = await supabaseServidor();
  const { error } = await supabase.from('cartoes').delete().eq('id', String(form.get('id') ?? ''));
  if (error) return { erro: 'Não foi possível excluir. Tente de novo.' };
  refresh();
  return { ok: true };
}
