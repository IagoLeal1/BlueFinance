import 'server-only';

/** Resposta de erro da API: { erro: "mensagem em português" }. */
export function erro(status: number, mensagem: string): Response {
  return Response.json({ erro: mensagem }, { status });
}
