'use server';

import { refresh } from 'next/cache';
import { diaDe } from '@/domain/datas';
import { TIPOS_INVESTIMENTO } from '@/domain/investimentos';
import { lerPercentual } from '@/domain/rendimento';
import { supabaseServidor } from '@/lib/supabase/server';
import { brutoDoInvestimento, simularCdi, somaDosAportes } from '@/server/investimentos';

export interface EstadoInvestimento {
  ok?: boolean;
  erro?: string;
}

const DIA = /^\d{4}-\d{2}-\d{2}$/;

/** Os campos de "Como rende": % do CDI (com data, quanto aplicou e IR) ou "Não calcular" (valor à mão). */
function lerComoRende(form: FormData):
  | { erro: string }
  | { cdi: { percentual: number; aplicadoEm: string; aplicado: number; isentoIr: boolean } }
  | { manual: { valorAtual: number } } {
  if (String(form.get('como_rende')) === 'cdi') {
    const percentual = lerPercentual(String(form.get('percentual_cdi') ?? ''));
    if (percentual === null) return { erro: 'Digite quanto do CDI rende (ex.: 101,5).' };
    const aplicadoEm = String(form.get('aplicado_em') ?? '');
    if (!DIA.test(aplicadoEm) || aplicadoEm > diaDe(new Date())) return { erro: 'Escolha quando aplicou (até hoje).' };
    const aplicado = Number(form.get('aplicado'));
    if (!Number.isSafeInteger(aplicado) || aplicado <= 0) return { erro: 'Digite quanto aplicou.' };
    return { cdi: { percentual, aplicadoEm, aplicado, isentoIr: String(form.get('ir')) === 'isento' } };
  }
  const valorAtual = Number(form.get('valor_atual'));
  if (!Number.isSafeInteger(valorAtual) || valorAtual < 0) return { erro: 'Digite o valor atual.' };
  return { manual: { valorAtual } };
}

function lerCadastro(form: FormData): { erro: string } | { nome: string; tipo: string; instituicao: string } {
  const nome = String(form.get('nome') ?? '').trim();
  const tipo = String(form.get('tipo') ?? '');
  const instituicao = String(form.get('instituicao') ?? '').trim();
  if (!nome) return { erro: 'Dê um nome ao investimento.' };
  if (!(TIPOS_INVESTIMENTO as readonly string[]).includes(tipo)) return { erro: 'Escolha o tipo.' };
  if (!instituicao) return { erro: 'Diga onde o dinheiro está investido.' };
  return { nome, tipo, instituicao };
}

/** Cadastra um investimento do usuário logado: nome, tipo, onde está e como rende. */
export async function criarInvestimento(_anterior: EstadoInvestimento, form: FormData): Promise<EstadoInvestimento> {
  const cadastro = lerCadastro(form);
  if ('erro' in cadastro) return cadastro;
  const rende = lerComoRende(form);
  if ('erro' in rende) return rende;

  const supabase = await supabaseServidor();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims.sub;
  if (!userId) return { erro: 'Sua sessão expirou. Entre de novo.' };

  // O valor de quando você cadastra conta como aportado; o que mudar depois é rendimento.
  const valor = 'cdi' in rende ? rende.cdi.aplicado : rende.manual.valorAtual;
  const { error } = await supabase.from('investimentos').insert({
    user_id: userId,
    ...cadastro,
    valor_atual: valor,
    aportado: valor,
    ...('cdi' in rende && { percentual_cdi: rende.cdi.percentual, aplicado_em: rende.cdi.aplicadoEm, isento_ir: rende.cdi.isentoIr }),
  });
  if (error) return { erro: 'Não foi possível salvar. Tente de novo.' };

  refresh();
  return { ok: true };
}

/**
 * Edita o investimento. "% do CDI" liga o cálculo: o aportado vira o que foi aplicado mais os aportes de depois.
 * "Não calcular" volta ao valor digitado à mão.
 */
export async function editarInvestimento(_anterior: EstadoInvestimento, form: FormData): Promise<EstadoInvestimento> {
  const id = String(form.get('id') ?? '');
  const cadastro = lerCadastro(form);
  if ('erro' in cadastro) return cadastro;
  const rende = lerComoRende(form);
  if ('erro' in rende) return rende;

  const mudancas =
    'cdi' in rende
      ? {
          ...cadastro,
          percentual_cdi: rende.cdi.percentual,
          aplicado_em: rende.cdi.aplicadoEm,
          isento_ir: rende.cdi.isentoIr,
          aportado: rende.cdi.aplicado + (await somaDosAportes(id)),
        }
      : { ...cadastro, percentual_cdi: null, aplicado_em: null, isento_ir: false, valor_atual: rende.manual.valorAtual };

  const supabase = await supabaseServidor();
  const { data, error } = await supabase.from('investimentos').update(mudancas).eq('id', id).select('id');
  if (error || !data?.length) return { erro: 'Não foi possível salvar. Tente de novo.' };
  refresh();
  return { ok: true };
}

/** Prévia do formulário: quanto valeria hoje pelo CDI. Null enquanto os campos não estão completos. */
export async function previaCdi(entrada: { investimentoId?: string; percentual: string; aplicadoEm: string; aplicado: number }): Promise<number | null> {
  const percentual = lerPercentual(entrada.percentual);
  if (percentual === null || !DIA.test(entrada.aplicadoEm) || entrada.aplicadoEm > diaDe(new Date()) || entrada.aplicado <= 0) return null;
  return simularCdi({ investimentoId: entrada.investimentoId || undefined, percentual, aplicadoEm: entrada.aplicadoEm, aplicado: entrada.aplicado });
}

/** Atualiza quanto o investimento vale hoje (o rendimento é a diferença para o aportado). */
export async function atualizarValorInvestimento(_anterior: EstadoInvestimento, form: FormData): Promise<EstadoInvestimento> {
  const id = String(form.get('id') ?? '');
  const valor = Number(form.get('valor_atual'));
  if (!Number.isSafeInteger(valor) || valor < 0) return { erro: 'Digite o valor atual.' };

  const supabase = await supabaseServidor();
  const { data, error } = await supabase.from('investimentos').update({ valor_atual: valor }).eq('id', id).select('id');
  if (error || !data?.length) return { erro: 'Não foi possível salvar. Tente de novo.' };
  refresh();
  return { ok: true };
}

/** "Ajustar valor": o valor que o app do banco mostra. A diferença para o calculado vira rendimento, a partir de hoje. */
export async function ajustarValorInvestimento(_anterior: EstadoInvestimento, form: FormData): Promise<EstadoInvestimento> {
  const id = String(form.get('id') ?? '');
  const valor = Number(form.get('valor_banco'));
  if (!Number.isSafeInteger(valor) || valor < 0) return { erro: 'Digite o valor que o banco mostra.' };

  const supabase = await supabaseServidor();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims.sub;
  if (!userId) return { erro: 'Sua sessão expirou. Entre de novo.' };

  const bruto = await brutoDoInvestimento(id);
  if (bruto === null) return { erro: 'Este investimento não rende pelo CDI.' };
  if (valor !== bruto) {
    const { error } = await supabase
      .from('ajustes_investimento')
      .insert({ user_id: userId, investimento_id: id, dia: diaDe(new Date()), valor: valor - bruto });
    if (error) return { erro: 'Não foi possível salvar. Tente de novo.' };
  }
  refresh();
  return { ok: true };
}
