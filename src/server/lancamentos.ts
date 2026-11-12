import 'server-only';
import type { TipoLancamento } from '@/domain/money';
import { somarMeses } from '@/domain/datas';
import { MESES_DE_ASSINATURA, vencimentoDaFatura, vencimentoPadrao } from '@/domain/parcelas';
import { mesDe, type FormaPagamento, type Lancamento } from '@/domain/summary';
import { supabaseServidor } from '@/lib/supabase/server';

export type { FormaPagamento };
const ORIGENS = ['app', 'atalho', 'vr', 'acerto'] as const;

export interface LancamentoListado extends Lancamento {
  id: string;
  descricao: string;
  icone: string;
  /** Ordem da categoria de gasto (1 a 6 têm cor própria, a mesma dos gráficos). */
  ordemCategoria: number | null;
  /** "vr": o depósito do mês no VR; "acerto": saldo inicial ou correção do VR. */
  origem: (typeof ORIGENS)[number];
  forma: FormaPagamento | null;
  cartao: { id: string; nome: string; diaFechamento: number; diaVencimento: number } | null;
  /** Compra parcelada: id da compra e posição ("2 de 3"). */
  compraId: string | null;
  parcela: number | null;
  parcelas: number | null;
  /** Compra no crédito: valor total da compra (soma de todas as parcelas, em todos os meses). */
  totalDaCompra: number | null;
  /** Assinatura ("Todo mês"): o mesmo valor em toda fatura, até o usuário parar. */
  recorrente: boolean;
}

const CAMPOS =
  'id, tipo, valor, data, descricao, origem, competencia, forma_pagamento, compra_id, parcela, parcelas, recorrente, categorias(nome, icone, ordem), investimentos(nome), cartoes(id, nome, dia_fechamento, dia_vencimento)';

/** Lançamentos do usuário logado num mês de competência, do mais novo ao mais antigo (RLS: só os dele). */
export function lancamentosDoMes(mes: string): Promise<LancamentoListado[]> {
  return buscar([mes]);
}

/**
 * Para o que passa na conta no mês: os lançamentos dele e também a fatura do mês anterior, que pode vencer
 * neste (cartão que fecha 25 e vence 5). Quem usa filtra por `mes` (competência) ou por `pagoEm`.
 */
export function lancamentosDoCaixa(mes: string): Promise<LancamentoListado[]> {
  return buscar([somarMeses(mes, -1), mes]);
}

async function buscar(meses: string[]): Promise<LancamentoListado[]> {
  const supabase = await supabaseServidor();
  const { data, error } = await supabase
    .from('lancamentos')
    .select(CAMPOS)
    .in('competencia', meses)
    .order('data', { ascending: false })
    .order('parcela', { ascending: true });
  if (error) throw error;

  // Total de cada compra no crédito do mês, somando as parcelas de todos os meses.
  const compras = [...new Set(data.map((l) => l.compra_id).filter((c): c is string => !!c))];
  const totais = new Map<string, number>();
  if (compras.length > 0) {
    const { data: parcelas, error: erroParcelas } = await supabase.from('lancamentos').select('compra_id, valor').in('compra_id', compras);
    if (erroParcelas) throw erroParcelas;
    for (const p of parcelas) totais.set(p.compra_id!, (totais.get(p.compra_id!) ?? 0) + p.valor);
  }

  return data.map((l) => ({
    id: l.id,
    tipo: l.tipo as TipoLancamento,
    valor: l.valor,
    data: l.data,
    mes: l.competencia,
    descricao: l.descricao,
    categoria: l.categorias?.nome ?? l.investimentos?.nome ?? (l.forma_pagamento === 'vr' ? 'VR' : 'Sem categoria'),
    origem: (ORIGENS as readonly string[]).includes(l.origem) ? (l.origem as LancamentoListado['origem']) : 'app',
    icone: l.categorias?.icone ?? (l.tipo === 'investimento' ? 'piggy-bank' : l.forma_pagamento === 'vr' ? 'wallet-cards' : 'circle'),
    ordemCategoria: l.categorias?.ordem ?? null,
    forma: (l.forma_pagamento as FormaPagamento | null) ?? null,
    cartao: l.cartoes
      ? {
          id: l.cartoes.id,
          nome: l.cartoes.nome,
          diaFechamento: l.cartoes.dia_fechamento,
          diaVencimento: l.cartoes.dia_vencimento ?? vencimentoPadrao(l.cartoes.dia_fechamento),
        }
      : null,
    // No crédito, o dinheiro sai da conta no vencimento da fatura.
    pagoEm:
      l.forma_pagamento === 'credito' && l.cartoes
        ? vencimentoDaFatura(l.competencia, l.cartoes.dia_fechamento, l.cartoes.dia_vencimento ?? vencimentoPadrao(l.cartoes.dia_fechamento))
        : undefined,
    compraId: l.compra_id,
    parcela: l.parcela,
    parcelas: l.parcelas,
    totalDaCompra: l.compra_id && !l.recorrente ? (totais.get(l.compra_id) ?? null) : null,
    recorrente: l.recorrente,
  }));
}

/** Último mês com parcela no crédito depois de `mes` (para o seletor de mês mostrar os meses à frente). */
export async function ultimoMesComParcelas(mes: string): Promise<string | null> {
  const supabase = await supabaseServidor();
  const { data, error } = await supabase
    .from('lancamentos')
    .select('competencia')
    .eq('forma_pagamento', 'credito')
    .eq('recorrente', false)
    .gt('competencia', mes)
    .order('competencia', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data?.competencia ?? null;
}

/**
 * Mantém as assinaturas ("Todo mês") lançadas até 24 meses à frente: para cada uma, repete o último mês
 * (valor, categoria, descrição, cartão) nos meses que faltam. Idempotente; roda ao abrir Início e Lançamentos.
 */
export async function completarAssinaturas(agora: Date): Promise<void> {
  const supabase = await supabaseServidor();
  const { data, error } = await supabase
    .from('lancamentos')
    .select('user_id, compra_id, valor, categoria_id, descricao, data, cartao_id, parcela, competencia')
    .eq('recorrente', true)
    .order('competencia');
  if (error) throw error;
  const ultimas = new Map<string, (typeof data)[number]>();
  for (const l of data) if (l.compra_id) ultimas.set(l.compra_id, l);

  const horizonte = somarMeses(mesDe(agora.toISOString()), MESES_DE_ASSINATURA);
  const faltam = [...ultimas.values()].flatMap((u) => {
    const novas = [];
    for (let k = 1, mes = somarMeses(u.competencia, 1); mes <= horizonte; k++, mes = somarMeses(mes, 1)) {
      novas.push({
        user_id: u.user_id,
        tipo: 'despesa',
        valor: u.valor,
        categoria_id: u.categoria_id,
        descricao: u.descricao,
        data: u.data,
        forma_pagamento: 'credito',
        cartao_id: u.cartao_id,
        compra_id: u.compra_id,
        parcela: (u.parcela ?? 0) + k,
        recorrente: true,
        competencia: mes,
      });
    }
    return novas;
  });
  if (faltam.length > 0) {
    const { error: erroInsert } = await supabase.from('lancamentos').insert(faltam);
    if (erroInsert) throw erroInsert;
  }
}
