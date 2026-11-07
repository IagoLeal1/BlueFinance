import 'server-only';
import { supabaseServidor } from '@/lib/supabase/server';

/** Ordem de cada categoria de despesa do usuário — é ela que fixa a cor nos gráficos. */
export async function ordemDasCategorias(): Promise<Map<string, number>> {
  const supabase = await supabaseServidor();
  const { data } = await supabase.from('categorias').select('nome, ordem').eq('tipo', 'despesa');
  return new Map((data ?? []).map((c) => [c.nome, c.ordem]));
}

/** Categorias do usuário (despesa e receita), na ordem do app. */
export async function categoriasDoUsuario(): Promise<{ id: string; nome: string; tipo: string; icone: string }[]> {
  const supabase = await supabaseServidor();
  const { data } = await supabase.from('categorias').select('id, nome, tipo, icone').order('ordem');
  return data ?? [];
}
