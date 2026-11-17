import { erro } from '@/server/http';
import { sincronizarBanco } from '@/server/banco';

/** Busca diária no banco (Open Finance). Chamado pelo agendamento da Vercel (vercel.json), com o CRON_SECRET. */
export async function GET(request: Request) {
  const segredo = process.env.CRON_SECRET;
  if (!segredo || request.headers.get('authorization') !== `Bearer ${segredo}`) return erro(401, 'Não autorizado.');
  return Response.json(await sincronizarBanco());
}
