import 'server-only';
import { generateRequestDetails } from 'web-push';
import { avisosDeFatura, type Aviso, type FaturaParaAviso } from '@/domain/avisos';
import { diaDe } from '@/domain/datas';
import { faturasDoCartao, vencimentoPadrao } from '@/domain/parcelas';
import { supabaseAdmin } from './supabase-admin';

export interface Inscricao {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}

/** Quem manda o aviso (exigido pelo protocolo): o endereço do app. */
const REMETENTE = 'https://bluefinance-chi.vercel.app';

function chaves() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) throw new Error('Chaves do aviso (VAPID) não configuradas.');
  return { subject: REMETENTE, publicKey, privateKey };
}

/**
 * Manda um aviso para um aparelho. O web-push cifra a mensagem e assina o pedido; o envio é com fetch.
 * 404/410 do serviço de push = o aparelho não existe mais (app removido, permissão retirada).
 */
export async function enviarAviso(inscricao: Inscricao, aviso: Aviso): Promise<'ok' | 'sumiu' | 'erro'> {
  const pedido = generateRequestDetails(
    { endpoint: inscricao.endpoint, keys: { p256dh: inscricao.p256dh, auth: inscricao.auth } },
    JSON.stringify(aviso),
    { vapidDetails: chaves(), TTL: 60 * 60 * 12 },
  );
  // O fetch calcula o tamanho sozinho.
  const cabecalhos = Object.fromEntries(Object.entries(pedido.headers).filter(([nome]) => nome.toLowerCase() !== 'content-length'));
  try {
    const res = await fetch(pedido.endpoint, { method: pedido.method, headers: cabecalhos as Record<string, string>, body: new Uint8Array(pedido.body as Buffer) });
    if (res.status === 404 || res.status === 410) return 'sumiu';
    return res.ok ? 'ok' : 'erro';
  } catch {
    return 'erro';
  }
}

/**
 * O aviso diário (agendado na Vercel, 9h de Brasília): para cada pessoa com aparelho inscrito, as faturas
 * que vencem hoje ou amanhã; manda para todos os aparelhos dela e esquece os que sumiram.
 */
export async function mandarAvisosDoDia(agora: Date): Promise<{ enviados: number; removidos: number }> {
  const { data: inscricoes, error } = await supabaseAdmin.from('inscricoes_push').select('id, user_id, endpoint, p256dh, auth');
  if (error) throw error;
  if (inscricoes.length === 0) return { enviados: 0, removidos: 0 };

  const usuarios = [...new Set(inscricoes.map((i) => i.user_id))];
  const { data: cartoes, error: erroCartoes } = await supabaseAdmin
    .from('cartoes')
    .select('id, user_id, nome, dia_fechamento, dia_vencimento')
    .in('user_id', usuarios);
  if (erroCartoes) throw erroCartoes;

  const iso = agora.toISOString();
  const candidatas = cartoes.flatMap((c) => {
    const fechada = faturasDoCartao(iso, c.dia_fechamento, c.dia_vencimento ?? vencimentoPadrao(c.dia_fechamento)).fechada;
    return fechada ? [{ cartao: c, ...fechada }] : [];
  });
  const totais = new Map<string, number>();
  if (candidatas.length > 0) {
    const { data: linhas, error: erroLinhas } = await supabaseAdmin
      .from('lancamentos')
      .select('cartao_id, competencia, valor')
      .eq('forma_pagamento', 'credito')
      .in('cartao_id', candidatas.map((f) => f.cartao.id))
      .in('competencia', [...new Set(candidatas.map((f) => f.mes))]);
    if (erroLinhas) throw erroLinhas;
    for (const l of linhas) totais.set(`${l.cartao_id}@${l.competencia}`, (totais.get(`${l.cartao_id}@${l.competencia}`) ?? 0) + l.valor);
  }

  const hoje = diaDe(agora);
  let enviados = 0;
  const sumiram: string[] = [];
  for (const userId of usuarios) {
    const faturas: FaturaParaAviso[] = candidatas
      .filter((f) => f.cartao.user_id === userId)
      .map((f) => ({ cartao: f.cartao.nome, mes: f.mes, vence: f.vence, total: totais.get(`${f.cartao.id}@${f.mes}`) ?? 0 }));
    const avisos = avisosDeFatura(faturas, hoje);
    for (const inscricao of inscricoes.filter((i) => i.user_id === userId)) {
      for (const aviso of avisos) {
        const r = await enviarAviso(inscricao, aviso);
        if (r === 'ok') enviados++;
        if (r === 'sumiu') {
          sumiram.push(inscricao.id);
          break;
        }
      }
    }
  }
  if (sumiram.length > 0) await supabaseAdmin.from('inscricoes_push').delete().in('id', sumiram);
  return { enviados, removidos: sumiram.length };
}
