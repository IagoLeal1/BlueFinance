'use server';

import { refresh } from 'next/cache';
import { TIPOS_INVESTIMENTO } from '@/domain/investimentos';
import { supabaseServidor } from '@/lib/supabase/server';

export interface EstadoInvestimento {
  ok?: boolean;
  erro?: string;
}

/** Cadastra um investimento do usuário logado: nome, tipo, onde está e quanto vale hoje. */
export async function criarInvestimento(_anterior: EstadoInvestimento, form: FormData): Promise<EstadoInvestimento> {
  const nome = String(form.get('nome') ?? '').trim();
  const tipo = String(form.get('tipo') ?? '');
  const instituicao = String(form.get('instituicao') ?? '').trim();
  const valor = Number(form.get('valor_atual'));

  if (!nome) return { erro: 'Dê um nome ao investimento.' };
  if (!(TIPOS_INVESTIMENTO as readonly string[]).includes(tipo)) return { erro: 'Escolha o tipo.' };
  if (!instituicao) return { erro: 'Diga onde o dinheiro está investido.' };
  if (!Number.isSafeInteger(valor) || valor < 0) return { erro: 'Digite o valor atual.' };

  const supabase = await supabaseServidor();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims.sub;
  if (!userId) return { erro: 'Sua sessão expirou. Entre de novo.' };

  const { error } = await supabase.from('investimentos').insert({ user_id: userId, nome, tipo, instituicao, valor_atual: valor });
  if (error) return { erro: 'Não foi possível salvar. Tente de novo.' };

  refresh();
  return { ok: true };
}
