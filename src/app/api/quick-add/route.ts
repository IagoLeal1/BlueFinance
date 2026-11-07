import { formatSigned } from '@/domain/money';
import { bearer } from '@/server/auth';
import { erro } from '@/server/http';
import { supabaseAdmin } from '@/server/supabase-admin';
import { usuarioDoToken } from '@/server/tokens';

interface Corpo {
  categoria?: unknown;
  descricao?: unknown;
  valor_centavos?: unknown;
}

/** Cria um gasto a partir do Atalho do iOS. Autentica com o token pessoal (Bearer bf_…). */
export async function POST(request: Request) {
  const userId = await usuarioDoToken(bearer(request));
  if (!userId) return erro(401, 'Token inválido. Gere um novo em Ajustes.');

  const corpo = (await request.json()) as Corpo;
  const valor = corpo.valor_centavos;
  if (typeof valor !== 'number' || !Number.isSafeInteger(valor) || valor <= 0) {
    return erro(400, 'O valor precisa ser um número inteiro de centavos maior que zero.');
  }

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

  const descricao = typeof corpo.descricao === 'string' ? corpo.descricao.trim() : '';

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
