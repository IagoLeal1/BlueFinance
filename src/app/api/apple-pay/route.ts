import { randomUUID } from 'node:crypto';
import { acharLancadoAgora, lerValorEmReais, nomeDoLugar } from '@/domain/apple-pay';
import { ehLugar, estabelecimentoDe } from '@/domain/banco';
import { nomeDoMes } from '@/domain/datas';
import { formatBRL, formatSigned } from '@/domain/money';
import { mesDaFatura } from '@/domain/parcelas';
import type { Database } from '@/lib/supabase/database.types';
import { pagamentoDoCartao } from '@/server/apple-pay';
import { bearer } from '@/server/auth';
import { erro } from '@/server/http';
import { supabaseAdmin } from '@/server/supabase-admin';
import { usuarioDoToken } from '@/server/tokens';
import { vrPeloAtalho } from '@/server/vr';

interface Corpo {
  /** Valor do pagamento: número em reais ou o texto do iPhone ("R$ 8,50"). */
  valor?: unknown;
  /** Nome do lugar, como a Carteira mostra ("Padaria Real"). */
  lugar?: unknown;
  /** Nome do cartão na Carteira ("C6 Débito"). */
  cartao?: unknown;
}

/**
 * Apple Pay (design kit: TelaApplePay). Chamado pela automação "Carteira" do Atalhos ao encostar o iPhone ou o
 * Watch, com o token do Atalho. Lugar conhecido entra com a categoria e o nome aprendidos; lugar novo entra na hora
 * numa categoria sugerida (Outros) e "a confirmar". Se você já lançou o mesmo pagamento pelo Atalho, só confere.
 * A resposta traz a notificação que o Atalho mostra ("mensagem").
 */
export async function POST(request: Request) {
  const userId = await usuarioDoToken(bearer(request));
  if (!userId) return erro(401, 'Token inválido. Gere um novo em Ajustes.');
  const corpo = ((await request.json().catch(() => ({}))) ?? {}) as Corpo;
  const valor = lerValorEmReais(corpo.valor);
  if (!valor) return erro(400, 'Não achei o valor do pagamento.');
  const lugar = nomeDoLugar(typeof corpo.lugar === 'string' ? corpo.lugar : '');
  const chave = estabelecimentoDe(lugar);
  const nomeDoCartao = typeof corpo.cartao === 'string' && corpo.cartao.trim() ? corpo.cartao.trim() : 'Apple Pay';
  const db = supabaseAdmin;
  const agora = new Date();
  const pagamento = await pagamentoDoCartao(userId, nomeDoCartao);

  const [repetido, recentes] = await Promise.all([
    // A automação às vezes roda duas vezes para o mesmo pagamento.
    db
      .from('lancamentos')
      .select('descricao, categorias(nome)')
      .eq('user_id', userId)
      .eq('origem', 'applepay')
      .eq('valor', valor)
      .eq('estabelecimento', chave)
      .gte('criado_em', new Date(agora.getTime() - 2 * 60_000).toISOString())
      .limit(1)
      .maybeSingle(),
    db
      .from('lancamentos')
      .select('id, valor, forma_pagamento, data, parcela, parcelas, origem, descricao, categoria_id, estabelecimento, categorias(nome)')
      .eq('user_id', userId)
      .eq('tipo', 'despesa')
      .eq('valor', valor)
      .is('estabelecimento', null)
      .gte('data', new Date(agora.getTime() - 35 * 60_000).toISOString()),
  ]);
  if (repetido.data) {
    return Response.json({ mensagem: `Gasto salvo: ${repetido.data.categorias?.nome ?? 'Outros'} · ${repetido.data.descricao} · ${formatSigned(valor, 'despesa')}` });
  }

  // Já lançado pelo Atalho: só confere, e o lugar aprende a sua categoria e o seu nome.
  const candidatos = recentes.data ?? [];
  const par = acharLancadoAgora(
    { valor, forma: pagamento.forma, agora },
    candidatos.map((l) => ({ id: l.id, valor: l.valor, forma: l.forma_pagamento, data: l.data, parcela: l.parcela, parcelas: l.parcelas, origem: l.origem })),
  );
  if (par) {
    const lancado = candidatos.find((l) => l.id === par)!;
    await db.from('lancamentos').update({ estabelecimento: chave }).eq('id', par);
    if (lancado.categoria_id && ehLugar(chave)) {
      await db
        .from('regras_banco')
        .upsert(
          { user_id: userId, tipo: 'despesa', estabelecimento: chave, categoria_id: lancado.categoria_id, descricao: lancado.descricao },
          { onConflict: 'user_id,tipo,estabelecimento', ignoreDuplicates: true },
        );
    }
    return Response.json({ mensagem: `Já estava lançado: ${lancado.categorias?.nome ?? 'Outros'} · ${lancado.descricao} · ${formatSigned(valor, 'despesa')}` });
  }

  const [{ data: regraDoLugar }, { data: despesas }] = await Promise.all([
    db
      .from('regras_banco')
      .select('categoria_id, descricao, categorias(nome)')
      .eq('user_id', userId)
      .eq('tipo', 'despesa')
      .eq('estabelecimento', chave)
      .maybeSingle(),
    db.from('categorias').select('id, nome').eq('user_id', userId).eq('tipo', 'despesa').order('ordem'),
  ]);
  const sugerida = despesas?.find((c) => c.nome === 'Outros') ?? despesas?.at(-1) ?? null;
  // Sem o nome do lugar (a Carteira não mandou), não há o que reconhecer.
  const regra = ehLugar(chave) ? regraDoLugar : null;
  const categoria = regra ? { id: regra.categoria_id, nome: regra.categorias?.nome ?? 'Outros' } : sugerida;
  const descricao = regra?.descricao ?? lugar;
  const linha: Database['public']['Tables']['lancamentos']['Insert'] = {
    user_id: userId,
    tipo: 'despesa',
    valor,
    categoria_id: categoria?.id ?? null,
    descricao,
    data: agora.toISOString(),
    origem: 'applepay',
    forma_pagamento: pagamento.forma,
    a_confirmar: !regra,
    estabelecimento: chave,
    ...(pagamento.forma === 'credito' && {
      cartao_id: pagamento.cartao.id,
      compra_id: randomUUID(),
      parcela: 1,
      parcelas: 1,
      competencia: mesDaFatura(agora.toISOString(), pagamento.cartao.diaFechamento),
    }),
  };
  const { data: criado, error } = await db.from('lancamentos').insert(linha).select('id, competencia').single();
  if (error) throw error;

  const vr = pagamento.forma === 'vr' ? await vrPeloAtalho(userId) : null;
  const ondeCaiu =
    pagamento.forma === 'vr'
      ? ` no VR (sobram ${formatBRL(vr?.saldo ?? 0)})`
      : pagamento.forma === 'credito'
        ? ` no crédito (${pagamento.cartao.nome}, fatura de ${nomeDoMes(criado.competencia)})`
        : '';
  const quanto = formatSigned(valor, 'despesa');
  const nomeDaCategoria = categoria?.nome ?? 'Sem categoria';
  const mensagem = regra
    ? `Gasto salvo: ${nomeDaCategoria} · ${descricao} · ${quanto}${ondeCaiu}`
    : `Lugar novo: ${descricao} · ${quanto} em ${nomeDaCategoria}${ondeCaiu ? `,${ondeCaiu}` : ''}. Confirme em Lançamentos.`;
  return Response.json({ mensagem, lancamento: { id: criado.id } }, { status: 201 });
}
