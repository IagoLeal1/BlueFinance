import { bearer } from '@/server/auth';
import { erro } from '@/server/http';
import { supabaseAdmin } from '@/server/supabase-admin';
import { usuarioDoToken } from '@/server/tokens';

/**
 * Categorias de despesa, na ordem do app: `categorias` (só os nomes) para o "Escolher da lista" do Atalho e `itens`
 * (nome, ícone e ordem, que dá a cor) para o Gasto rápido do app do iPhone.
 */
export async function GET(request: Request) {
  const userId = await usuarioDoToken(bearer(request));
  if (!userId) return erro(401, 'Token inválido. Gere um novo em Ajustes.');

  const { data, error } = await supabaseAdmin
    .from('categorias')
    .select('nome, icone, ordem')
    .eq('user_id', userId)
    .eq('tipo', 'despesa')
    .neq('nome', 'Fatura') // só para o total de uma fatura, lançado no app
    .order('ordem');
  if (error) throw error;

  return Response.json({ categorias: data.map((c) => c.nome), itens: data });
}
