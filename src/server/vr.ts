import 'server-only';
import { cache } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { depositosDevidos, proximoDeposito, saldoDoVr, type ConfigVr } from '@/domain/vr';
import type { Database } from '@/lib/supabase/database.types';
import { supabaseServidor } from '@/lib/supabase/server';
import { supabaseAdmin } from './supabase-admin';

export interface Vr extends ConfigVr {
  saldo: number;
  /** Próximo dia em que o VR cai ("2026-12-05"). */
  proximo: string;
}

/**
 * O VR do usuário (ou null, se ele não usa), já com os depósitos que caíram desde a última vez: cada mês
 * vira um lançamento "Depósito do VR" no dia dele. O índice único (um depósito por mês) impede duplicar
 * quando duas telas completam ao mesmo tempo.
 */
async function carregarVr(db: SupabaseClient<Database>, userId: string | null, agora: Date): Promise<Vr | null> {
  let consultaVr = db.from('vr').select('user_id, valor_mensal, dia, desde');
  let consultaLancamentos = db.from('lancamentos').select('tipo, valor, origem, competencia').eq('forma_pagamento', 'vr');
  if (userId) {
    consultaVr = consultaVr.eq('user_id', userId);
    consultaLancamentos = consultaLancamentos.eq('user_id', userId);
  }
  const [{ data: cfg, error }, { data: linhas, error: erroLinhas }] = await Promise.all([consultaVr.maybeSingle(), consultaLancamentos]);
  if (error) throw error;
  if (erroLinhas) throw erroLinhas;
  if (!cfg) return null;

  const config: ConfigVr = { valorMensal: cfg.valor_mensal, dia: cfg.dia, desde: cfg.desde };
  const jaCaiu = new Set(linhas.filter((l) => l.origem === 'vr').map((l) => l.competencia));
  const faltam = depositosDevidos(config, agora).filter((d) => !jaCaiu.has(d.competencia));
  const gravados = await Promise.all(
    faltam.map(async (d) => {
      const { error: erro } = await db.from('lancamentos').insert({
        user_id: cfg.user_id,
        tipo: 'receita',
        valor: d.valor,
        descricao: 'Depósito do VR',
        data: `${d.dia}T00:00:00-03:00`,
        competencia: d.competencia,
        forma_pagamento: 'vr',
        origem: 'vr',
      });
      // 23505: outra tela gravou este mês primeiro — ele já está no banco, mas não nesta soma.
      if (erro && erro.code !== '23505') throw erro;
      return { tipo: 'receita', valor: d.valor };
    }),
  );
  return { ...config, saldo: saldoDoVr([...linhas, ...gravados]), proximo: proximoDeposito(config.dia, agora) };
}

/** VR de quem está logado (RLS: só o dele). Uma vez por requisição: o layout e a página dividem o resultado. */
export const vrDoUsuario = cache(async (): Promise<Vr | null> => carregarVr(await supabaseServidor(), null, new Date()));

/** VR do dono do token do Atalho (sem sessão: chave secreta, filtrando pelo usuário). */
export function vrPeloAtalho(userId: string, agora: Date = new Date()): Promise<Vr | null> {
  return carregarVr(supabaseAdmin, userId, agora);
}
