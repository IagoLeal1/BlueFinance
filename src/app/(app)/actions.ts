'use server';

import { refresh } from 'next/cache';
import { randomUUID } from 'node:crypto';
import type { TipoLancamento } from '@/domain/money';
import { somarMeses } from '@/domain/datas';
import { dividirParcelas, mesDaFatura, mesesDasParcelas } from '@/domain/parcelas';
import { supabaseServidor } from '@/lib/supabase/server';

export interface EstadoLancamento {
  ok?: boolean;
  erro?: string;
  /** Id do lançamento criado — usado pelo "Desfazer". */
  id?: string;
  /** Compra no crédito: id da compra (todas as parcelas) — o "Desfazer" apaga a compra inteira. */
  compraId?: string;
}

const FORMAS = ['debito', 'pix', 'credito'] as const;
type Forma = (typeof FORMAS)[number];

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

  const forma = (FORMAS as readonly string[]).includes(String(form.get('forma'))) ? (String(form.get('forma')) as Forma) : 'debito';
  if (tipo === 'despesa' && forma === 'credito') {
    return criarCompraNoCredito(supabase, userId, form, valor, { id: categoria.id, nome: categoria.nome }, descricao);
  }

  const { data: criado, error } = await supabase
    .from('lancamentos')
    .insert({
      user_id: userId,
      tipo,
      valor,
      categoria_id: categoria.id,
      descricao: descricao || categoria.nome,
      forma_pagamento: tipo === 'despesa' ? forma : null,
    })
    .select('id')
    .single();
  if (error) return { erro: 'Não foi possível salvar. Tente de novo.' };

  refresh();
  return { ok: true, id: criado.id };
}

/**
 * Compra no crédito: divide em parcelas e grava cada uma no mês da sua fatura
 * (pelo dia de fechamento do cartão). Um único insert com todas as linhas — ou grava tudo, ou nada.
 */
async function criarCompraNoCredito(
  supabase: Awaited<ReturnType<typeof supabaseServidor>>,
  userId: string,
  form: FormData,
  total: number,
  categoria: { id: string; nome: string },
  descricao: string,
): Promise<EstadoLancamento> {
  const parcelas = Number(form.get('parcelas') ?? 1);
  if (!Number.isInteger(parcelas) || parcelas < 1 || parcelas > 24) return { erro: 'Escolha de 1 a 24 parcelas.' };
  if (total < parcelas) return { erro: 'O valor é pequeno demais para tantas parcelas.' };
  const { data: cartao } = await supabase.from('cartoes').select('id, dia_fechamento').eq('id', String(form.get('cartao_id') ?? '')).maybeSingle();
  if (!cartao) return { erro: 'Escolha o cartão.' };

  const agora = new Date().toISOString();
  const meses = mesesDasParcelas(mesDaFatura(agora, cartao.dia_fechamento), parcelas);
  const valores = dividirParcelas(total, parcelas);
  const compraId = randomUUID();
  const { error } = await supabase.from('lancamentos').insert(
    valores.map((valor, i) => ({
      user_id: userId,
      tipo: 'despesa',
      valor,
      categoria_id: categoria.id,
      descricao: descricao || categoria.nome,
      data: agora,
      forma_pagamento: 'credito',
      cartao_id: cartao.id,
      compra_id: compraId,
      parcela: i + 1,
      parcelas,
      competencia: meses[i]!,
    })),
  );
  if (error) return { erro: 'Não foi possível salvar. Tente de novo.' };

  refresh();
  return { ok: true, compraId };
}

/** Altera valor, descrição e categoria de um lançamento do usuário (aporte ajusta o investimento junto). */
export async function editarLancamento(_anterior: EstadoLancamento, form: FormData): Promise<EstadoLancamento> {
  const id = String(form.get('id') ?? '');
  const valor = Number(form.get('valor_centavos'));
  const descricao = String(form.get('descricao') ?? '').trim();
  if (!Number.isSafeInteger(valor) || valor <= 0) return { erro: 'Digite um valor maior que zero.' };

  const supabase = await supabaseServidor();
  // Categoria nova (opcional): só vale se for do próprio usuário — o RLS de categorias garante.
  const categoriaId = String(form.get('categoria_id') ?? '');
  let p_categoria: string | undefined;
  if (categoriaId) {
    const { data } = await supabase.from('categorias').select('id').eq('id', categoriaId).maybeSingle();
    if (!data) return { erro: 'Categoria não encontrada.' };
    p_categoria = data.id;
  }
  const { error } = await supabase.rpc('editar_lancamento', { p_id: id, p_valor: valor, p_descricao: descricao, p_categoria });
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

/** Exclui uma compra no crédito inteira (todas as parcelas). */
export async function excluirCompra(_anterior: EstadoLancamento, form: FormData): Promise<EstadoLancamento> {
  const supabase = await supabaseServidor();
  const { error } = await supabase.from('lancamentos').delete().eq('compra_id', String(form.get('compra_id') ?? ''));
  if (error) return { erro: 'Não foi possível excluir. Tente de novo.' };
  refresh();
  return { ok: true };
}

/**
 * Edita uma compra no crédito inteira: valor total, número de parcelas, descrição e categoria.
 * Refaz a divisão a partir da fatura da 1ª parcela e regrava todas as parcelas de uma vez (regravar_compra).
 */
export async function editarCompra(_anterior: EstadoLancamento, form: FormData): Promise<EstadoLancamento> {
  const compraId = String(form.get('compra_id') ?? '');
  const total = Number(form.get('valor_centavos'));
  const parcelas = Number(form.get('parcelas'));
  const descricao = String(form.get('descricao') ?? '').trim();
  if (!Number.isSafeInteger(total) || total <= 0) return { erro: 'Digite um valor maior que zero.' };
  if (!Number.isInteger(parcelas) || parcelas < 1 || parcelas > 24) return { erro: 'Escolha de 1 a 24 parcelas.' };
  if (total < parcelas) return { erro: 'O valor é pequeno demais para tantas parcelas.' };

  const supabase = await supabaseServidor();
  const { data: atuais } = await supabase
    .from('lancamentos')
    .select('parcela, competencia, data, cartao_id, categoria_id, descricao')
    .eq('compra_id', compraId)
    .order('parcela');
  const primeira = atuais?.[0];
  if (!primeira) return { erro: 'Compra não encontrada.' };

  // Categoria nova (opcional): só vale se for do próprio usuário — o RLS de categorias garante.
  let categoriaId = primeira.categoria_id;
  const novaCategoria = String(form.get('categoria_id') ?? '');
  if (novaCategoria) {
    const { data } = await supabase.from('categorias').select('id').eq('id', novaCategoria).maybeSingle();
    if (!data) return { erro: 'Categoria não encontrada.' };
    categoriaId = data.id;
  }

  const primeiroMes = somarMeses(primeira.competencia, -((primeira.parcela ?? 1) - 1));
  const meses = mesesDasParcelas(primeiroMes, parcelas);
  const linhas = dividirParcelas(total, parcelas).map((valor, i) => ({
    valor,
    categoria_id: categoriaId,
    descricao: descricao || primeira.descricao,
    data: primeira.data,
    cartao_id: primeira.cartao_id,
    parcela: i + 1,
    parcelas,
    competencia: meses[i]!,
  }));
  const { error } = await supabase.rpc('regravar_compra', { p_compra: compraId, p_linhas: linhas });
  if (error) return { erro: 'Não foi possível salvar. Tente de novo.' };
  refresh();
  return { ok: true };
}
