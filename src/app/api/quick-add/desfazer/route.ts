import { bearer } from '@/server/auth';
import { erro } from '@/server/http';
import { supabaseAdmin } from '@/server/supabase-admin';
import { usuarioDoToken } from '@/server/tokens';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * "Desfazer" da Dynamic Island do app do iPhone: apaga o gasto que acabou de ser lançado pelo Atalho ou pelo app
 * (`desfazer` da resposta do POST /api/quick-add: o id do lançamento ou, no crédito, da compra com as parcelas).
 * Só alcança lançamentos com origem "atalho" do dono do token.
 */
export async function POST(request: Request) {
  const userId = await usuarioDoToken(bearer(request));
  if (!userId) return erro(401, 'Token inválido. Gere um novo em Ajustes.');

  const { desfazer } = (await request.json().catch(() => ({}))) as { desfazer?: unknown };
  if (typeof desfazer !== 'string' || !UUID.test(desfazer)) return erro(404, 'Lançamento não encontrado.');
  const { data, error } = await supabaseAdmin
    .from('lancamentos')
    .delete()
    .eq('user_id', userId)
    .eq('origem', 'atalho')
    .or(`id.eq.${desfazer},compra_id.eq.${desfazer}`)
    .select('id');
  if (error) throw error;
  if (data.length === 0) return erro(404, 'Lançamento não encontrado.');
  return Response.json({ mensagem: 'Lançamento desfeito.' });
}
