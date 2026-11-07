import { bearer } from '@/server/auth';
import { erro } from '@/server/http';
import { supabaseAdmin } from '@/server/supabase-admin';
import { usuarioDoToken } from '@/server/tokens';

/** Categorias de despesa, na ordem do app, para o "Escolher da lista" do Atalho. */
export async function GET(request: Request) {
  const userId = await usuarioDoToken(bearer(request));
  if (!userId) return erro(401, 'Token inválido. Gere um novo em Ajustes.');

  const { data, error } = await supabaseAdmin
    .from('categorias')
    .select('nome')
    .eq('user_id', userId)
    .eq('tipo', 'despesa')
    .order('ordem');
  if (error) throw error;

  return Response.json({ categorias: data.map((c) => c.nome) });
}
