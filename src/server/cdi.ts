import 'server-only';
import { ultimoCdiEsperado, type TaxaCdi } from '@/domain/rendimento';
import { supabaseServidor } from '@/lib/supabase/server';
import { supabaseAdmin } from './supabase-admin';

/** CDI diário do Banco Central (SGS 12, % ao dia). "off" desliga a busca (testes usam taxas semeadas). */
const BCB = process.env.BCB_SGS_URL || 'https://api.bcb.gov.br/dados/serie/bcdata.sgs.12/dados';
const UMA_HORA = 3_600_000;

const paraBr = (dia: string) => `${dia.slice(8, 10)}/${dia.slice(5, 7)}/${dia.slice(0, 4)}`;
const deBr = (data: string) => `${data.slice(6, 10)}-${data.slice(3, 5)}-${data.slice(0, 2)}`;
const diaSeguinte = (dia: string) => new Date(Date.parse(`${dia}T00:00:00Z`) + 86_400_000).toISOString().slice(0, 10);

/**
 * Garante as taxas do CDI de `desde` até o último dia que o Banco Central já devia ter publicado. Busca só o que
 * falta e, se o mais recente ainda não saiu (feriado, atraso), tenta de novo no máximo uma vez por hora.
 * Falha na rede não quebra a tela: segue com as taxas que já estão guardadas.
 */
export async function sincronizarCdi(hoje: string, desde: string): Promise<void> {
  if (BCB === 'off') return;
  const db = supabaseAdmin;
  const [{ data: estado }, { data: ultima }] = await Promise.all([
    db.from('cdi_sincronizacao').select('desde, verificado_em').maybeSingle(),
    db.from('taxas_cdi').select('dia').order('dia', { ascending: false }).limit(1).maybeSingle(),
  ]);
  const faltaAntes = !estado || estado.desde > desde;
  const faltaDepois = !ultima || ultima.dia < ultimoCdiEsperado(hoje);
  const verificadoHaPouco = !!estado && Date.now() - Date.parse(estado.verificado_em) < UMA_HORA;
  if (!faltaAntes && (!faltaDepois || verificadoHaPouco)) return;

  const inicio = faltaAntes || !ultima ? desde : diaSeguinte(ultima.dia);
  try {
    const resposta = await fetch(`${BCB}?formato=json&dataInicial=${paraBr(inicio)}&dataFinal=${paraBr(hoje)}`, {
      signal: AbortSignal.timeout(4000),
      cache: 'no-store',
    });
    // Sem dado novo no período o Banco Central responde 404: não é erro.
    if (!resposta.ok && resposta.status !== 404) throw new Error(`HTTP ${resposta.status}`);
    const linhas: { data: string; valor: string }[] = resposta.status === 404 ? [] : await resposta.json();
    const taxas = linhas.map((l) => ({ dia: deBr(l.data), taxa: Number(l.valor) })).filter((t) => Number.isFinite(t.taxa));
    if (taxas.length > 0) {
      const { error } = await db.from('taxas_cdi').upsert(taxas);
      if (error) throw error;
    }
    await db.from('cdi_sincronizacao').upsert({ id: true, desde: faltaAntes ? desde : estado!.desde, verificado_em: new Date().toISOString() });
  } catch (erro) {
    console.error('[cdi] não consegui buscar o CDI no Banco Central:', erro);
  }
}

/** Taxas do CDI guardadas a partir de `desde`, em ordem. */
export async function taxasCdiDesde(desde: string): Promise<TaxaCdi[]> {
  const supabase = await supabaseServidor();
  const { data, error } = await supabase.from('taxas_cdi').select('dia, taxa').gte('dia', desde).order('dia');
  if (error) throw error;
  return data.map((t) => ({ dia: t.dia, taxa: Number(t.taxa) }));
}
