import { usuarioDaSessao } from '@/server/auth';
import { erro } from '@/server/http';
import { criarTokenPessoal } from '@/server/tokens';

/** Gera um token pessoal para o Atalho do iOS. Exige login (access token do Supabase). */
export async function POST(request: Request) {
  const userId = await usuarioDaSessao(request);
  if (!userId) return erro(401, 'Faça login para gerar um token.');
  const token = await criarTokenPessoal(userId);
  return Response.json({ token }, { status: 201 });
}
