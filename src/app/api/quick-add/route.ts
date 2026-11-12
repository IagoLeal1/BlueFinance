import { randomUUID } from 'node:crypto';
import { nomeDoMes } from '@/domain/datas';
import { formatBRL, formatSigned } from '@/domain/money';
import { dividirParcelas, mesDaFatura, mesesDasParcelas } from '@/domain/parcelas';
import { lerTextoRapido } from '@/domain/texto-rapido';
import { bearer } from '@/server/auth';
import { lerFormaDoAtalho } from '@/server/formas-atalho';
import { erro } from '@/server/http';
import { supabaseAdmin } from '@/server/supabase-admin';
import { usuarioDoToken } from '@/server/tokens';
import { vrPeloAtalho } from '@/server/vr';

interface Corpo {
  categoria?: unknown;
  /** Atalho de 2 passos: "32,90 mercado do bairro" (valor + descrição num campo só). */
  texto?: unknown;
  /** Teclado numérico do Atalho: valor em reais (32.9) + descrição opcional. */
  valor?: unknown;
  descricao?: unknown;
  /** Formato antigo, ainda aceito: valor em centavos. */
  valor_centavos?: unknown;
  /** "Como pagou?": "Débito" (padrão), "Pix", "VR" ou "Crédito · {cartão}". */
  forma?: unknown;
  /** "Em quantas vezes?" (só no crédito): 1 a 24; vazio é à vista. Número ou texto ("3"). */
  parcelas?: unknown;
}

/** Parcelas do Atalho: vazio é 1x; aceita número ou texto com um inteiro de 1 a 24. */
function lerParcelas(valor: unknown): number | null {
  if (valor === undefined || valor === null || valor === '') return 1;
  const n = typeof valor === 'number' ? valor : typeof valor === 'string' && /^\s*\d+\s*$/.test(valor) ? Number(valor) : NaN;
  return Number.isInteger(n) && n >= 1 && n <= 24 ? n : null;
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
  const pagamento = await lerFormaDoAtalho(userId, corpo.forma);
  if (!pagamento) return erro(422, 'Forma de pagamento não encontrada. Atualize a lista no Atalho.');

  // No crédito, a compra cai na fatura pelo dia de fechamento do cartão e pode ser parcelada.
  const parcelas = pagamento.forma === 'credito' ? lerParcelas(corpo.parcelas) : 1;
  if (parcelas === null || valor < parcelas) return erro(400, 'Em quantas vezes? Use um número de 1 a 24.');
  const agora = new Date().toISOString();
  const base = {
    user_id: userId,
    tipo: 'despesa',
    categoria_id: categoria.id,
    descricao: descricao || categoria.nome,
    origem: 'atalho',
    data: agora,
    forma_pagamento: pagamento.forma,
  };
  const linhas =
    pagamento.forma === 'credito'
      ? (() => {
          const compraId = randomUUID();
          const meses = mesesDasParcelas(mesDaFatura(agora, pagamento.cartao.diaFechamento), parcelas);
          return dividirParcelas(valor, parcelas).map((v, i) => ({
            ...base,
            valor: v,
            cartao_id: pagamento.cartao.id,
            compra_id: compraId,
            parcela: i + 1,
            parcelas,
            competencia: meses[i]!,
          }));
        })()
      : [{ ...base, valor }];
  const { data: gravados, error } = await supabaseAdmin
    .from('lancamentos')
    .insert(linhas)
    .select('id, tipo, valor, descricao, data, origem, competencia, parcela')
    .order('parcela');
  if (error) throw error;
  const lancamento = gravados[0]!;

  // No VR, a notificação diz quanto sobra nele.
  const vr = pagamento.forma === 'vr' ? await vrPeloAtalho(userId) : null;
  const ondeCaiu =
    pagamento.forma === 'vr'
      ? ` no VR (sobram ${formatBRL(vr?.saldo ?? 0)})`
      : pagamento.forma !== 'credito'
        ? ''
        : parcelas > 1
          ? ` em ${parcelas}x no crédito (${pagamento.cartao.nome}, 1ª na fatura de ${nomeDoMes(lancamento.competencia)})`
          : ` no crédito (${pagamento.cartao.nome}, fatura de ${nomeDoMes(lancamento.competencia)})`;
  return Response.json(
    {
      mensagem: `Gasto salvo: ${categoria.nome} · ${formatSigned(valor, 'despesa')}${ondeCaiu}`,
      lancamento: { ...lancamento, categoria: categoria.nome },
    },
    { status: 201 },
  );
}
