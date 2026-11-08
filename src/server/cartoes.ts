import 'server-only';
import { vencimentoPadrao } from '@/domain/parcelas';
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
