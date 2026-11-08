import 'server-only';
import { diaDoFechamento, faturasDoCartao, vencimentoPadrao } from '@/domain/parcelas';
import { supabaseServidor } from '@/lib/supabase/server';

export interface Cartao {
  id: string;
  nome: string;
  diaFechamento: number;
  diaVencimento: number;
}

/** Cartões de crédito do usuário logado, em ordem de cadastro. */
export async function listarCartoes(): Promise<Cartao[]> {
  const supabase = await supabaseServidor();
  const { data, error } = await supabase.from('cartoes').select('id, nome, dia_fechamento, dia_vencimento').order('criado_em');
  if (error) throw error;
  return data.map((c) => ({
    id: c.id,
    nome: c.nome,
    diaFechamento: c.dia_fechamento,
    diaVencimento: c.dia_vencimento ?? vencimentoPadrao(c.dia_fechamento),
  }));
}

export interface ResumoDoCartao {
  cartao: Cartao;
  aberta: { mes: string; fecha: number; total: number };
  fechada: { mes: string; vence: string; total: number } | null;
}

/**
 * Para o Início: de cada cartão, a fatura fechada a pagar (até o vencimento) e a aberta, com os totais;
 * e o que já está comprometido em parcelas depois da fatura aberta.
 */
export async function resumoDosCartoes(
  cartoes: Cartao[],
  agora: Date,
): Promise<{ cartoes: ResumoDoCartao[]; aVir: { total: number; ultimoMes: string | null }; assinaturas: number }> {
  if (cartoes.length === 0) return { cartoes: [], aVir: { total: 0, ultimoMes: null }, assinaturas: 0 };
  const hoje = agora.toISOString();
  const faturas = cartoes.map((c) => ({ cartao: c, ...faturasDoCartao(hoje, c.diaFechamento, c.diaVencimento) }));
  const desde = faturas.map((f) => f.fechada?.mes ?? f.aberta).sort()[0]!;

  const supabase = await supabaseServidor();
  const { data, error } = await supabase
    .from('lancamentos')
    .select('valor, competencia, cartao_id, recorrente')
    .eq('forma_pagamento', 'credito')
    .in('cartao_id', cartoes.map((c) => c.id))
    .gte('competencia', desde);
  if (error) throw error;

  const soma = (cartaoId: string, filtro: (mes: string) => boolean) =>
    data.filter((l) => l.cartao_id === cartaoId && filtro(l.competencia)).reduce((t, l) => t + l.valor, 0);
  let total = 0;
  let assinaturas = 0;
  let ultimoMes: string | null = null;
  const resumos = faturas.map(({ cartao, aberta, fechada }) => {
    // Assinaturas contam por mês (a da fatura aberta), não como parcelas a vir.
    assinaturas += data.filter((x) => x.cartao_id === cartao.id && x.recorrente && x.competencia === aberta).reduce((t, l) => t + l.valor, 0);
    for (const l of data.filter((x) => x.cartao_id === cartao.id && !x.recorrente && x.competencia > aberta)) {
      total += l.valor;
      if (!ultimoMes || l.competencia > ultimoMes) ultimoMes = l.competencia;
    }
    return {
      cartao,
      aberta: { mes: aberta, fecha: diaDoFechamento(aberta, cartao.diaFechamento), total: soma(cartao.id, (m) => m === aberta) },
      fechada: fechada && { ...fechada, total: soma(cartao.id, (m) => m === fechada.mes) },
    };
  });
  return { cartoes: resumos, aVir: { total, ultimoMes }, assinaturas };
}
