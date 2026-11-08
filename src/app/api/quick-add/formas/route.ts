import { bearer } from '@/server/auth';
import { formasDoAtalho } from '@/server/formas-atalho';
import { erro } from '@/server/http';
import { usuarioDoToken } from '@/server/tokens';

/** "Como pagou?" do Atalho: Débito, Pix e cada cartão, com a última forma usada na `?categoria=` em primeiro. */
export async function GET(request: Request) {
  const userId = await usuarioDoToken(bearer(request));
  if (!userId) return erro(401, 'Token inválido. Gere um novo em Ajustes.');

  const categoria = new URL(request.url).searchParams.get('categoria');
  return Response.json({ formas: await formasDoAtalho(userId, categoria) });
}
