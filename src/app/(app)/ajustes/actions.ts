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
