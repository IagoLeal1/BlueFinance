import 'server-only';
import { limitesDoMes } from '@/domain/datas';
import type { TipoLancamento } from '@/domain/money';
import type { Lancamento } from '@/domain/summary';
import { supabaseServidor } from '@/lib/supabase/server';

/** Lançamentos do usuário logado num mês (RLS garante que são só os dele). */
export async function lancamentosDoMes(mes: string): Promise<Lancamento[]> {
  const { inicio, fim } = limitesDoMes(mes);
  const supabase = await supabaseServidor();
  const { data, error } = await supabase
    .from('lancamentos')
    .select('tipo, valor, data, descricao, categorias(nome)')
    .gte('data', inicio)
    .lt('data', fim)
    .order('data', { ascending: false });
  if (error) throw error;
  return data.map((l) => ({
    tipo: l.tipo as TipoLancamento,
    valor: l.valor,
    data: l.data,
    categoria: l.categorias?.nome ?? 'Sem categoria',
  }));
}
