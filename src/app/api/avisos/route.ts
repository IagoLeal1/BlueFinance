import { erro } from '@/server/http';
import { mandarAvisosDoDia } from '@/server/avisos';

/** Aviso diário da fatura. Chamado pelo agendamento da Vercel (vercel.json), com o CRON_SECRET. */
export async function GET(request: Request) {
  const segredo = process.env.CRON_SECRET;
  if (!segredo || request.headers.get('authorization') !== `Bearer ${segredo}`) return erro(401, 'Não autorizado.');
  return Response.json(await mandarAvisosDoDia(new Date()));
}
