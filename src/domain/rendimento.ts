import type { Centavos } from './money';

/** CDI de um dia útil, em % ao dia, como o Banco Central publica (SGS 12): 0,050788. */
export interface TaxaCdi {
  dia: string;
  taxa: number;
}

/** Dinheiro que entrou no investimento num dia: um aporte, ou um ajuste ao valor do banco (que é rendimento). */
export interface Lote {
  data: string;
  valor: Centavos;
  ajuste?: boolean;
}

export interface LoteRendendo {
  data: string;
  valor: Centavos;
  bruto: Centavos;
  /** Quantos dias com CDI esse aporte já rendeu. */
  diasUteis: number;
  /** Quando o IR desse aporte cai para a próxima faixa (null: já está nos 15%). */
  irCai: { aliquota: number; em: string } | null;
}

export interface RendimentoCdi {
  bruto: Centavos;
  aportado: Centavos;
  rendeu: Centavos;
  /** Quanto rendeu no último dia com CDI publicado. */
  ultimoDia: { dia: string; ganho: Centavos } | null;
  iof: Centavos;
  ir: Centavos;
  /** Se resgatar hoje: bruto menos IOF e IR. */
  liquido: Centavos;
  lotes: LoteRendendo[];
}

const DIA = 86_400_000;
const utc = (dia: string) => Date.UTC(Number(dia.slice(0, 4)), Number(dia.slice(5, 7)) - 1, Number(dia.slice(8, 10)));
const somarDias = (dia: string, n: number) => new Date(utc(dia) + n * DIA).toISOString().slice(0, 10);
const diasEntre = (de: string, ate: string) => Math.round((utc(ate) - utc(de)) / DIA);
const fimDeSemana = (dia: string) => [0, 6].includes(new Date(utc(dia)).getUTCDay());

/** IOF regressivo sobre o rendimento, pelo número de dias corridos (do 30º dia em diante, zero). */
const IOF = [100, 96, 93, 90, 86, 83, 80, 76, 73, 70, 66, 63, 60, 56, 53, 50, 46, 43, 40, 36, 33, 30, 26, 23, 20, 16, 13, 10, 6, 3];

/** IR regressivo da renda fixa pelos dias corridos desde o aporte. */
export function aliquotaIr(dias: number): number {
  return dias <= 180 ? 22.5 : dias <= 360 ? 20 : dias <= 720 ? 17.5 : 15;
}

function proximaFaixa(data: string, dias: number): LoteRendendo['irCai'] {
  if (dias <= 180) return { aliquota: 20, em: somarDias(data, 181) };
  if (dias <= 360) return { aliquota: 17.5, em: somarDias(data, 361) };
  if (dias <= 720) return { aliquota: 15, em: somarDias(data, 721) };
  return null;
}

/**
 * Investimento a `percentual`% do CDI: cada lote rende, desde a própria data, em cada dia com CDI publicado antes de
 * hoje: valor × Π (1 + CDI do dia × percentual). O líquido tira o IOF (primeiros 30 dias) e o IR de cada aporte pelo
 * prazo dele; um ajuste é todo rendimento e paga como o aporte mais antigo.
 */
export function rendimentoCdi({
  lotes,
  taxas,
  percentual,
  hoje,
  isentoIr,
}: {
  lotes: Lote[];
  taxas: TaxaCdi[];
  percentual: number;
  hoje: string;
  isentoIr: boolean;
}): RendimentoCdi {
  const dias = taxas.filter((t) => t.dia < hoje).sort((a, b) => a.dia.localeCompare(b.dia));
  const fatorDe = (t: TaxaCdi) => 1 + (t.taxa / 100) * (percentual / 100);
  const ultimo = dias.at(-1);

  const calculados = lotes.map((l) => {
    const rende = dias.filter((t) => t.dia >= l.data);
    const fator = rende.reduce((f, t) => f * fatorDe(t), 1);
    const bruto = Math.round(l.valor * fator);
    const rendeuNoUltimo = ultimo && rende.at(-1) === ultimo;
    const antes = rendeuNoUltimo ? Math.round(l.valor * (fator / fatorDe(ultimo))) : bruto;
    return { ...l, bruto, diasUteis: rende.length, ganhoUltimo: bruto - antes };
  });

  const aportes = calculados.filter((l) => !l.ajuste);
  const maisAntigo = aportes.reduce<string | null>((m, l) => (m === null || l.data < m ? l.data : m), null);
  let iof = 0;
  let ir = 0;
  for (const l of calculados) {
    const rendimento = l.ajuste ? l.bruto : l.bruto - l.valor;
    const corridos = diasEntre(l.ajuste ? (maisAntigo ?? l.data) : l.data, hoje);
    const iofDoLote = Math.round((rendimento * (IOF[corridos] ?? 0)) / 100);
    iof += iofDoLote;
    ir += isentoIr ? 0 : Math.round(((rendimento - iofDoLote) * aliquotaIr(corridos)) / 100);
  }
  iof = Math.max(0, iof);
  ir = Math.max(0, ir);

  const bruto = calculados.reduce((s, l) => s + l.bruto, 0);
  const aportado = aportes.reduce((s, l) => s + l.valor, 0);
  const ganho = calculados.reduce((s, l) => s + l.ganhoUltimo, 0);
  return {
    bruto,
    aportado,
    rendeu: bruto - aportado,
    ultimoDia: ultimo && calculados.some((l) => l.diasUteis > 0 && l.data <= ultimo.dia) ? { dia: ultimo.dia, ganho } : null,
    iof,
    ir,
    liquido: bruto - iof - ir,
    lotes: aportes.map((l) => ({
      data: l.data,
      valor: l.valor,
      bruto: l.bruto,
      diasUteis: l.diasUteis,
      irCai: proximaFaixa(l.data, diasEntre(l.data, hoje)),
    })),
  };
}

/** Primeiro dia útil a partir de `dia` (sábado e domingo não rendem). */
export function comecaARender(dia: string): string {
  let d = dia;
  while (fimDeSemana(d)) d = somarDias(d, 1);
  return d;
}

function diaUtilAnterior(dia: string): string {
  let d = somarDias(dia, -1);
  while (fimDeSemana(d)) d = somarDias(d, -1);
  return d;
}

/** O Banco Central publica o CDI de um dia útil no seguinte, às vezes depois: até dois dias úteis antes de hoje. */
export function ultimoCdiEsperado(hoje: string): string {
  return diaUtilAnterior(diaUtilAnterior(hoje));
}

/** CDI anual equivalente (252 dias úteis), em %: 0,050788% ao dia ≈ 13,65% ao ano. */
export function cdiAoAno(taxaDia: number): number {
  return ((1 + taxaDia / 100) ** 252 - 1) * 100;
}

/** "101,5% do CDI". */
export function percentualDoCdi(percentual: number): string {
  return `${String(percentual).replace('.', ',')}% do CDI`;
}

/** Taxa do dia com 4 casas: "0,0508%". */
export function taxaAoDia(taxa: number): string {
  return `${taxa.toFixed(4).replace('.', ',')}%`;
}

/** Lê o % do CDI digitado ("101,5", "101.5", "100") e devolve o número, ou null se não for um % válido. */
export function lerPercentual(texto: string): number | null {
  const limpo = texto.replace('%', '').trim().replace(',', '.');
  if (!/^\d{1,4}(\.\d{1,2})?$/.test(limpo)) return null;
  const n = Number(limpo);
  return n > 0 && n <= 1000 ? n : null;
}
