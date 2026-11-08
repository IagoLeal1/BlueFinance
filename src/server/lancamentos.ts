import 'server-only';
import type { TipoLancamento } from '@/domain/money';
import type { Lancamento } from '@/domain/summary';
import { supabaseServidor } from '@/lib/supabase/server';

export type FormaPagamento = 'debito' | 'pix' | 'credito';

export interface LancamentoListado extends Lancamento {
  id: string;
  descricao: string;
  icone: string;
  origem: 'app' | 'atalho';
  forma: FormaPagamento | null;
  cartao: { id: string; nome: string; diaFechamento: number } | null;
  /** Compra parcelada: id da compra e posição ("2 de 3"). */
  compraId: string | null;
  parcela: number | null;
  parcelas: number | null;
  /** Compra no crédito: valor total da compra (soma de todas as parcelas, em todos os meses). */
  totalDaCompra: number | null;
}

const CAMPOS =
  'id, tipo, valor, data, descricao, origem, competencia, forma_pagamento, compra_id, parcela, parcelas, categorias(nome, icone), investimentos(nome), cartoes(id, nome, dia_fechamento)';

/** Lançamentos do usuário logado num mês de competência, do mais novo ao mais antigo (RLS: só os dele). */
export async function lancamentosDoMes(mes: string): Promise<LancamentoListado[]> {
  const supabase = await supabaseServidor();
  const { data, error } = await supabase
    .from('lancamentos')
    .select(CAMPOS)
    .eq('competencia', mes)
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
    categoria: l.categorias?.nome ?? l.investimentos?.nome ?? 'Sem categoria',
    origem: l.origem === 'atalho' ? 'atalho' : 'app',
    icone: l.categorias?.icone ?? (l.tipo === 'investimento' ? 'piggy-bank' : 'circle'),
    forma: (l.forma_pagamento as FormaPagamento | null) ?? null,
    cartao: l.cartoes ? { id: l.cartoes.id, nome: l.cartoes.nome, diaFechamento: l.cartoes.dia_fechamento } : null,
    compraId: l.compra_id,
    parcela: l.parcela,
    parcelas: l.parcelas,
    totalDaCompra: l.compra_id ? (totais.get(l.compra_id) ?? null) : null,
  }));
}

/** Último mês com parcela no crédito depois de `mes` (para o seletor de mês mostrar os meses à frente). */
export async function ultimoMesComParcelas(mes: string): Promise<string | null> {
  const supabase = await supabaseServidor();
  const { data, error } = await supabase
    .from('lancamentos')
    .select('competencia')
    .eq('forma_pagamento', 'credito')
    .gt('competencia', mes)
    .order('competencia', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data?.competencia ?? null;
}
