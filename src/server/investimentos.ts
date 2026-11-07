import 'server-only';
import { supabaseServidor } from '@/lib/supabase/server';

export interface Investimento {
  id: string;
  nome: string;
  tipo: string;
  instituicao: string;
  valorAtual: number;
}

export interface GrupoInstituicao {
  instituicao: string;
  total: number;
  investimentos: Investimento[];
}

/** Investimentos do usuário agrupados por instituição, do maior total para o menor. */
export async function investimentosPorInstituicao(): Promise<{ total: number; grupos: GrupoInstituicao[] }> {
  const supabase = await supabaseServidor();
  const { data, error } = await supabase.from('investimentos').select('id, nome, tipo, instituicao, valor_atual').order('valor_atual', { ascending: false });
  if (error) throw error;

  const grupos = new Map<string, GrupoInstituicao>();
  for (const i of data) {
    const g = grupos.get(i.instituicao) ?? { instituicao: i.instituicao, total: 0, investimentos: [] };
    g.total += i.valor_atual;
    g.investimentos.push({ id: i.id, nome: i.nome, tipo: i.tipo, instituicao: i.instituicao, valorAtual: i.valor_atual });
    grupos.set(i.instituicao, g);
  }
  const lista = [...grupos.values()].sort((a, b) => b.total - a.total);
  return { total: lista.reduce((t, g) => t + g.total, 0), grupos: lista };
}
