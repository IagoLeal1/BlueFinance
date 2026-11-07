import 'server-only';
import { limitesDoMes } from '@/domain/datas';
import type { TipoLancamento } from '@/domain/money';
import type { Lancamento } from '@/domain/summary';
import { supabaseServidor } from '@/lib/supabase/server';

export interface LancamentoListado extends Lancamento {
  id: string;
  descricao: string;
  icone: string;
  origem: 'app' | 'atalho';
}

/** Lançamentos do usuário logado num mês, do mais novo ao mais antigo (RLS: só os dele). */
export async function lancamentosDoMes(mes: string): Promise<LancamentoListado[]> {
  const { inicio, fim } = limitesDoMes(mes);
  const supabase = await supabaseServidor();
  const { data, error } = await supabase
    .from('lancamentos')
    .select('id, tipo, valor, data, descricao, origem, categorias(nome, icone), investimentos(nome)')
    .gte('data', inicio)
    .lt('data', fim)
    .order('data', { ascending: false });
  if (error) throw error;
  return data.map((l) => ({
    id: l.id,
    tipo: l.tipo as TipoLancamento,
    valor: l.valor,
    data: l.data,
    descricao: l.descricao,
    categoria: l.categorias?.nome ?? l.investimentos?.nome ?? 'Sem categoria',
    origem: l.origem === 'atalho' ? 'atalho' : 'app',
    icone: l.categorias?.icone ?? (l.tipo === 'investimento' ? 'piggy-bank' : 'circle'),
  }));
}
