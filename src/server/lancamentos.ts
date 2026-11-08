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

/** Soma das parcelas no crédito em meses depois de `mes` (o que já está comprometido). */
export async function parcelasAVir(mes: string): Promise<{ total: number; ultimoMes: string | null; compras: number }> {
  const supabase = await supabaseServidor();
  const { data, error } = await supabase
    .from('lancamentos')
    .select('valor, competencia, compra_id')
    .eq('forma_pagamento', 'credito')
    .gt('competencia', mes);
  if (error) throw error;
  const compras = new Set(data.map((l) => l.compra_id).filter(Boolean));
  const ultimoMes = data.reduce<string | null>((u, l) => (!u || l.competencia > u ? l.competencia : u), null);
  return { total: data.reduce((t, l) => t + l.valor, 0), ultimoMes, compras: compras.size };
}
