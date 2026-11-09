import 'server-only';
import { diaDe } from '@/domain/datas';
import { rendimentoCdi, type Lote, type RendimentoCdi, type TaxaCdi } from '@/domain/rendimento';
import { supabaseServidor } from '@/lib/supabase/server';
import { sincronizarCdi, taxasCdiDesde } from './cdi';

export interface Investimento {
  id: string;
  nome: string;
  tipo: string;
  instituicao: string;
  /** Pelo CDI: o bruto calculado hoje. "Não calcular": o valor digitado. */
  valorAtual: number;
  aportado: number;
  /** Rende sozinho a `percentual`% do CDI desde `aplicadoEm`; null em "Não calcular". */
  cdi: {
    percentual: number;
    aplicadoEm: string;
    isentoIr: boolean;
    /** O que foi aplicado em `aplicadoEm` (sem os aportes de depois). */
    aplicado: number;
    rendimento: RendimentoCdi;
  } | null;
}

export interface GrupoInstituicao {
  instituicao: string;
  total: number;
  investimentos: Investimento[];
}

export interface Carteira {
  total: number;
  aportado: number;
  grupos: GrupoInstituicao[];
  /** Quanto a carteira rendeu no último dia com CDI publicado. */
  ultimoDia: { dia: string; ganho: number } | null;
  /** O último CDI publicado (para a nota da aba). */
  cdiDoDia: TaxaCdi | null;
}

/** Investimentos do usuário agrupados por instituição, do maior total para o menor; os do CDI já com o rendimento de hoje. */
export async function investimentosPorInstituicao(agora: Date = new Date()): Promise<Carteira> {
  const supabase = await supabaseServidor();
  const { data, error } = await supabase
    .from('investimentos')
    .select('id, nome, tipo, instituicao, valor_atual, aportado, percentual_cdi, aplicado_em, isento_ir');
  if (error) throw error;

  const hoje = diaDe(agora);
  const doCdi = data.filter((i) => i.percentual_cdi !== null && i.aplicado_em !== null);
  const lotes = doCdi.length > 0 ? await lotesDepois(doCdi.map((i) => i.id)) : new Map<string, Lote[]>();
  const taxas = doCdi.length > 0 ? await taxasPara(hoje, [...doCdi.map((i) => i.aplicado_em!), ...[...lotes.values()].flat().map((l) => l.data)]) : [];

  const investimentos: Investimento[] = data.map((i) => {
    const base = { id: i.id, nome: i.nome, tipo: i.tipo, instituicao: i.instituicao, valorAtual: i.valor_atual, aportado: i.aportado, cdi: null };
    if (i.percentual_cdi === null || i.aplicado_em === null) return base;
    const depois = lotes.get(i.id) ?? [];
    // O aportado soma o que foi aplicado no início e os aportes de depois.
    const aplicado = Math.max(0, i.aportado - depois.filter((l) => !l.ajuste).reduce((s, l) => s + l.valor, 0));
    const rendimento = rendimentoCdi({
      lotes: [{ data: i.aplicado_em, valor: aplicado }, ...depois],
      taxas,
      percentual: Number(i.percentual_cdi),
      hoje,
      isentoIr: i.isento_ir,
    });
    return {
      ...base,
      valorAtual: rendimento.bruto,
      aportado: rendimento.aportado,
      cdi: { percentual: Number(i.percentual_cdi), aplicadoEm: i.aplicado_em, isentoIr: i.isento_ir, aplicado, rendimento },
    };
  });

  const grupos = new Map<string, GrupoInstituicao>();
  for (const i of investimentos.sort((a, b) => b.valorAtual - a.valorAtual)) {
    const g = grupos.get(i.instituicao) ?? { instituicao: i.instituicao, total: 0, investimentos: [] };
    g.total += i.valorAtual;
    g.investimentos.push(i);
    grupos.set(i.instituicao, g);
  }
  const lista = [...grupos.values()].sort((a, b) => b.total - a.total);

  const dias = investimentos.flatMap((i) => (i.cdi?.rendimento.ultimoDia ? [i.cdi.rendimento.ultimoDia] : []));
  const ultimo = dias.map((d) => d.dia).sort().at(-1);
  return {
    total: lista.reduce((t, g) => t + g.total, 0),
    aportado: investimentos.reduce((t, i) => t + i.aportado, 0),
    grupos: lista,
    ultimoDia: ultimo ? { dia: ultimo, ganho: dias.filter((d) => d.dia === ultimo).reduce((s, d) => s + d.ganho, 0) } : null,
    cdiDoDia: taxas.filter((t) => t.dia < hoje).at(-1) ?? null,
  };
}

/** Aportes (lançamentos) e ajustes de cada investimento: o dinheiro que entrou depois da aplicação. */
async function lotesDepois(ids: string[]): Promise<Map<string, Lote[]>> {
  const supabase = await supabaseServidor();
  const [aportes, ajustes] = await Promise.all([
    supabase.from('lancamentos').select('investimento_id, valor, data').eq('tipo', 'investimento').in('investimento_id', ids),
    supabase.from('ajustes_investimento').select('investimento_id, dia, valor').in('investimento_id', ids),
  ]);
  if (aportes.error) throw aportes.error;
  if (ajustes.error) throw ajustes.error;
  const lotes = new Map<string, Lote[]>();
  const juntar = (id: string, l: Lote) => lotes.set(id, [...(lotes.get(id) ?? []), l]);
  for (const a of aportes.data) juntar(a.investimento_id!, { data: diaDe(a.data), valor: a.valor });
  for (const a of ajustes.data) juntar(a.investimento_id, { data: a.dia, valor: a.valor, ajuste: true });
  return lotes;
}

/** Taxas do CDI desde a data mais antiga, buscando no Banco Central o que faltar. */
async function taxasPara(hoje: string, datas: string[]): Promise<TaxaCdi[]> {
  const desde = [...datas].sort()[0]!;
  await sincronizarCdi(hoje, desde);
  return taxasCdiDesde(desde);
}

/** Quanto o investimento valeria hoje com estes dados (a prévia do formulário), somando os aportes que ele já tem. */
export async function simularCdi(
  { investimentoId, percentual, aplicadoEm, aplicado }: { investimentoId?: string; percentual: number; aplicadoEm: string; aplicado: number },
  agora: Date = new Date(),
): Promise<number> {
  const hoje = diaDe(agora);
  const depois = investimentoId ? ((await lotesDepois([investimentoId])).get(investimentoId) ?? []) : [];
  const lotes = [{ data: aplicadoEm, valor: aplicado }, ...depois];
  const taxas = await taxasPara(hoje, lotes.map((l) => l.data));
  return rendimentoCdi({ lotes, taxas, percentual, hoje, isentoIr: false }).bruto;
}

/** Soma dos aportes feitos depois da aplicação (o aportado = aplicado + isso). */
export async function somaDosAportes(investimentoId: string): Promise<number> {
  const lotes = (await lotesDepois([investimentoId])).get(investimentoId) ?? [];
  return lotes.filter((l) => !l.ajuste).reduce((s, l) => s + l.valor, 0);
}

/** O bruto de hoje de um investimento pelo CDI (null se ele não rende pelo CDI). */
export async function brutoDoInvestimento(id: string, agora: Date = new Date()): Promise<number | null> {
  const supabase = await supabaseServidor();
  const { data: i } = await supabase.from('investimentos').select('aportado, percentual_cdi, aplicado_em').eq('id', id).maybeSingle();
  if (!i || i.percentual_cdi === null || i.aplicado_em === null) return null;
  const hoje = diaDe(agora);
  const depois = (await lotesDepois([id])).get(id) ?? [];
  const aplicado = Math.max(0, i.aportado - depois.filter((l) => !l.ajuste).reduce((s, l) => s + l.valor, 0));
  const lotes = [{ data: i.aplicado_em, valor: aplicado }, ...depois];
  const taxas = await taxasPara(hoje, lotes.map((l) => l.data));
  return rendimentoCdi({ lotes, taxas, percentual: Number(i.percentual_cdi), hoje, isentoIr: false }).bruto;
}
