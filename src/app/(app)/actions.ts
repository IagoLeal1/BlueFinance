'use server';

import { refresh } from 'next/cache';
import type { TipoLancamento } from '@/domain/money';
import { supabaseServidor } from '@/lib/supabase/server';

export interface EstadoLancamento {
  ok?: boolean;
  erro?: string;
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

  let categoria: { id: string; nome: string } | null = null;
  if (tipo !== 'investimento') {
    const { data } = await supabase
      .from('categorias')
      .select('id, nome')
      .eq('tipo', tipo)
      .eq('nome', nomeCategoria)
      .maybeSingle();
    if (!data) return { erro: 'Escolha uma categoria.' };
    categoria = data;
  }

  const { error } = await supabase.from('lancamentos').insert({
    user_id: userId,
    tipo,
    valor,
    categoria_id: categoria?.id ?? null,
    descricao: descricao || categoria?.nome || '',
  });
  if (error) return { erro: 'Não foi possível salvar. Tente de novo.' };

  refresh();
  return { ok: true };
}
