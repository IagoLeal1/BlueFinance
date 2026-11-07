import 'server-only';
import { supabaseServidor } from '@/lib/supabase/server';

/** Ordem de cada categoria de despesa do usuário — é ela que fixa a cor nos gráficos. */
export async function ordemDasCategorias(): Promise<Map<string, number>> {
  const supabase = await supabaseServidor();
  const { data } = await supabase.from('categorias').select('nome, ordem').eq('tipo', 'despesa');
  return new Map((data ?? []).map((c) => [c.nome, c.ordem]));
}
