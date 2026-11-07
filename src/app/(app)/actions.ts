'use server';

import { refresh } from 'next/cache';
import type { TipoLancamento } from '@/domain/money';
import { supabaseServidor } from '@/lib/supabase/server';

export interface EstadoLancamento {
  ok?: boolean;
  erro?: string;
  /** Id do lançamento criado — usado pelo "Desfazer". */
  id?: string;
}

const TIPOS: TipoLancamento[] = ['despesa', 'receita', 'investimento'];

/** Cria um lançamento do usuário logado (o RLS garante que só grava para ele mesmo). */
export async function criarLancamento(_anterior: EstadoLancamento, form: FormData): Promise<EstadoLancamento> {
  const tipo = String(form.get('tipo')) as TipoLancamento;
  const valor = Number(form.get('valor_centavos'));
  const nomeCategoria = String(form.get('categoria') ?? '');
  const descricao = String(form.get('descricao') ?? '').trim();

  if (!TIPOS.includes(tipo)) return { erro: 'Escolha o tipo do lançamento.' };
  if (!Number.isSafeInteger(valor) || valor <= 0) return { erro: 'Digite um valor maior que zero.' };

  const supabase = await supabaseServidor();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims.sub;
  if (!userId) return { erro: 'Sua sessão expirou. Entre de novo.' };

  if (tipo === 'investimento') {
    const investimento = String(form.get('investimento_id') ?? '');
    if (!investimento) return { erro: 'Escolha em qual investimento foi o aporte.' };
    const { data: id, error } = await supabase.rpc('registrar_aporte', { p_investimento: investimento, p_valor: valor, p_descricao: descricao });
    if (error) return { erro: 'Não foi possível salvar. Tente de novo.' };
    refresh();
    return { ok: true, id };
  }

  const { data: categoria } = await supabase
    .from('categorias')
    .select('id, nome')
    .eq('tipo', tipo)
    .eq('nome', nomeCategoria)
    .maybeSingle();
  if (!categoria) return { erro: 'Escolha uma categoria.' };

  const { data: criado, error } = await supabase
    .from('lancamentos')
    .insert({ user_id: userId, tipo, valor, categoria_id: categoria.id, descricao: descricao || categoria.nome })
    .select('id')
    .single();
  if (error) return { erro: 'Não foi possível salvar. Tente de novo.' };

  refresh();
  return { ok: true, id: criado.id };
}

/** Altera valor e descrição de um lançamento do usuário (aporte ajusta o investimento junto). */
export async function editarLancamento(_anterior: EstadoLancamento, form: FormData): Promise<EstadoLancamento> {
  const id = String(form.get('id') ?? '');
  const valor = Number(form.get('valor_centavos'));
  const descricao = String(form.get('descricao') ?? '').trim();
  if (!Number.isSafeInteger(valor) || valor <= 0) return { erro: 'Digite um valor maior que zero.' };

  const supabase = await supabaseServidor();
  const { error } = await supabase.rpc('editar_lancamento', { p_id: id, p_valor: valor, p_descricao: descricao });
  if (error) return { erro: 'Não foi possível salvar. Tente de novo.' };
  refresh();
  return { ok: true };
}

/** Exclui um lançamento do usuário (aporte estorna o valor do investimento). */
export async function excluirLancamento(_anterior: EstadoLancamento, form: FormData): Promise<EstadoLancamento> {
  const supabase = await supabaseServidor();
  const { error } = await supabase.rpc('excluir_lancamento', { p_id: String(form.get('id') ?? '') });
  if (error) return { erro: 'Não foi possível excluir. Tente de novo.' };
  refresh();
  return { ok: true };
}
