'use server';

import { refresh } from 'next/cache';
import { randomUUID } from 'node:crypto';
import { escolherCartao, linhasDoLancamento } from '@/domain/banco';
import { supabaseServidor } from '@/lib/supabase/server';

export interface EstadoDoBanco {
  ok?: boolean;
  erro?: string;
}

/**
 * Para conferir › Lançar: a transação do banco vira um lançamento (origem "banco") na categoria escolhida, e o
 * estabelecimento aprende a categoria e o "com o quê" — da próxima vez entra sozinho.
 */
export async function lancarDoBanco(_anterior: EstadoDoBanco, form: FormData): Promise<EstadoDoBanco> {
  const id = String(form.get('id') ?? '');
  const categoriaId = String(form.get('categoria_id') ?? '');
  const supabase = await supabaseServidor();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims.sub;
  if (!userId) return { erro: 'Sua sessão expirou. Entre de novo.' };

  const { data: t } = await supabase
    .from('transacoes_banco')
    .select('id, tipo, forma, valor, parcelas, data, descricao, nome, estabelecimento, nome_da_conta')
    .eq('id', id)
    .maybeSingle();
  if (!t) return { erro: 'Não achei essa transação do banco.' };
  const tipo = t.tipo as 'despesa' | 'receita';
  const { data: categoria } = await supabase.from('categorias').select('id').eq('id', categoriaId).eq('tipo', tipo).maybeSingle();
  if (!categoria) return { erro: 'Escolha a categoria.' };
  const descricao = String(form.get('descricao') ?? '').trim() || t.nome || t.descricao;
  const { data: cartoes } = await supabase.from('cartoes').select('id, nome, dia_fechamento').order('criado_em');
  const cartao = t.forma === 'credito' ? escolherCartao((cartoes ?? []).map((c) => ({ id: c.id, nome: c.nome, diaFechamento: c.dia_fechamento })), t.nome_da_conta) : null;

  let linhas;
  try {
    linhas = linhasDoLancamento(
      { tipo, forma: t.forma as 'debito' | 'pix' | 'credito', valor: t.valor, parcelas: t.parcelas, data: t.data },
      { userId, categoriaId: categoria.id, descricao, compraId: randomUUID(), cartao },
    );
  } catch (e) {
    return { erro: (e as Error).message };
  }

  // Marca antes de lançar: dois toques seguidos não lançam duas vezes.
  const { data: marcada } = await supabase
    .from('transacoes_banco')
    .update({ situacao: 'lancado' })
    .eq('id', t.id)
    .eq('situacao', 'conferir')
    .select('id');
  if (!marcada?.length) {
    refresh();
    return { ok: true };
  }
  const { data: criados, error } = await supabase.from('lancamentos').insert(linhas).select('id, parcela').order('parcela');
  if (error || !criados?.length) {
    await supabase.from('transacoes_banco').update({ situacao: 'conferir' }).eq('id', t.id);
    return { erro: 'Não foi possível lançar. Tente de novo.' };
  }
  await supabase.from('transacoes_banco').update({ lancamento_id: criados[0]!.id }).eq('id', t.id);
  await supabase
    .from('regras_banco')
    .upsert({ user_id: userId, tipo, estabelecimento: t.estabelecimento, categoria_id: categoria.id, descricao }, { onConflict: 'user_id,tipo,estabelecimento' });
  refresh();
  return { ok: true };
}

/** Para conferir › Ignorar: sai da lista sem lançar (ex.: transferência entre contas suas). */
export async function ignorarDoBanco(_anterior: EstadoDoBanco, form: FormData): Promise<EstadoDoBanco> {
  const supabase = await supabaseServidor();
  const { error } = await supabase
    .from('transacoes_banco')
    .update({ situacao: 'ignorado' })
    .eq('id', String(form.get('id') ?? ''))
    .eq('situacao', 'conferir');
  if (error) return { erro: 'Não foi possível ignorar. Tente de novo.' };
  refresh();
  return { ok: true };
}

/**
 * Para conferir › Confirmar (Apple Pay em lugar novo): o gasto já conta no mês; aqui ele fica com a categoria e o
 * "com o quê" escolhidos, e o lugar aprende — da próxima vez entra sozinho assim.
 */
export async function confirmarApplePay(_anterior: EstadoDoBanco, form: FormData): Promise<EstadoDoBanco> {
  const id = String(form.get('id') ?? '');
  const supabase = await supabaseServidor();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims.sub;
  if (!userId) return { erro: 'Sua sessão expirou. Entre de novo.' };

  const { data: l } = await supabase.from('lancamentos').select('id, descricao, estabelecimento').eq('id', id).maybeSingle();
  if (!l) return { erro: 'Não achei esse gasto.' };
  const { data: categoria } = await supabase
    .from('categorias')
    .select('id')
    .eq('id', String(form.get('categoria_id') ?? ''))
    .eq('tipo', 'despesa')
    .maybeSingle();
  if (!categoria) return { erro: 'Escolha a categoria.' };
  const descricao = String(form.get('descricao') ?? '').trim() || l.descricao;

  const { error } = await supabase.from('lancamentos').update({ categoria_id: categoria.id, descricao, a_confirmar: false }).eq('id', l.id);
  if (error) return { erro: 'Não foi possível confirmar. Tente de novo.' };
  if (l.estabelecimento) {
    await supabase
      .from('regras_banco')
      .upsert(
        { user_id: userId, tipo: 'despesa', estabelecimento: l.estabelecimento, categoria_id: categoria.id, descricao },
        { onConflict: 'user_id,tipo,estabelecimento' },
      );
  }
  refresh();
  return { ok: true };
}
