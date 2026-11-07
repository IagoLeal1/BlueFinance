import { formatSigned } from '@/domain/money';
import { lerTextoRapido } from '@/domain/texto-rapido';
import { bearer } from '@/server/auth';
import { erro } from '@/server/http';
import { supabaseAdmin } from '@/server/supabase-admin';
import { usuarioDoToken } from '@/server/tokens';

interface Corpo {
  categoria?: unknown;
  /** Atalho de 2 passos: "32,90 mercado do bairro" (valor + descrição num campo só). */
  texto?: unknown;
  /** Teclado numérico do Atalho: valor em reais (32.9) + descrição opcional. */
  valor?: unknown;
  descricao?: unknown;
  /** Formato antigo, ainda aceito: valor em centavos. */
  valor_centavos?: unknown;
}

/** Valor e descrição a partir de `texto`, de `valor` (reais) ou de `valor_centavos`, + `descricao`. */
function valorEDescricao(corpo: Corpo): { valor: number; descricao: string } | Response {
  if (typeof corpo.texto === 'string') {
    const lido = lerTextoRapido(corpo.texto);
    return lido ?? erro(400, 'Não achei o valor. Escreva assim: 32,90 mercado');
  }
  const descricao = typeof corpo.descricao === 'string' ? corpo.descricao.trim() : '';
  if (corpo.valor !== undefined) {
    // Teclado numérico do Atalho: reais com casas decimais (32.9). Arredonda para centavos.
    const centavos = typeof corpo.valor === 'number' && Number.isFinite(corpo.valor) ? Math.round(corpo.valor * 100) : NaN;
    if (!Number.isSafeInteger(centavos) || centavos <= 0) return erro(400, 'O valor precisa ser maior que zero.');
    return { valor: centavos, descricao };
  }
  const valor = corpo.valor_centavos;
  if (typeof valor !== 'number' || !Number.isSafeInteger(valor) || valor <= 0) {
    return erro(400, 'O valor precisa ser um número inteiro de centavos maior que zero.');
  }
  return { valor, descricao };
}

/** Cria um gasto a partir do Atalho do iOS. Autentica com o token pessoal (Bearer bf_…). */
export async function POST(request: Request) {
  const userId = await usuarioDoToken(bearer(request));
  if (!userId) return erro(401, 'Token inválido. Gere um novo em Ajustes.');

  const corpo = (await request.json()) as Corpo;
  const lido = valorEDescricao(corpo);
  if (lido instanceof Response) return lido;
  const { valor, descricao } = lido;

  const { data: categoria } =
    typeof corpo.categoria === 'string' && corpo.categoria
      ? await supabaseAdmin
          .from('categorias')
          .select('id, nome')
          .eq('user_id', userId)
          .eq('tipo', 'despesa')
          .eq('nome', corpo.categoria)
          .maybeSingle()
      : { data: null };
  if (!categoria) return erro(422, 'Categoria de despesa não encontrada. Atualize a lista no Atalho.');

  const { data: lancamento, error } = await supabaseAdmin
    .from('lancamentos')
    .insert({
      user_id: userId,
      tipo: 'despesa',
      valor,
      categoria_id: categoria.id,
      descricao: descricao || categoria.nome,
    })
    .select('id, tipo, valor, descricao, data')
    .single();
  if (error) throw error;

  return Response.json(
    {
      mensagem: `Gasto salvo: ${categoria.nome} · ${formatSigned(lancamento.valor, 'despesa')}`,
      lancamento: { ...lancamento, categoria: categoria.nome },
    },
    { status: 201 },
  );
}
