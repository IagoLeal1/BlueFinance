import 'server-only';

/**
 * Resposta de erro da API: { erro, mensagem } com o mesmo texto em português.
 * O Atalho do iOS mostra sempre o campo "mensagem", no sucesso e no erro.
 */
export function erro(status: number, mensagem: string): Response {
  return Response.json({ erro: mensagem, mensagem }, { status });
}
