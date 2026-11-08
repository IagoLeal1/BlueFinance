import type { Centavos, TipoLancamento } from './money';

export interface Lancamento {
  tipo: TipoLancamento;
  valor: Centavos;
  categoria: string;
  /** ISO 8601 com fuso, ex.: "2026-11-07T10:00:00-03:00". */
  data: string;
  /** Mês de competência ("2026-12"): para parcelas, o da fatura. Sem ele, vale o mês da data. */
  mes?: string;
  /**
   * Dia em que o dinheiro sai da conta ("2026-11-11"): no crédito, o vencimento da fatura. Quando existe,
   * o lançamento conta no mês desse dia e, antes dele, fica "a pagar".
   */
  pagoEm?: string;
}

export interface ResumoDoMes {
  entrou: Centavos;
  saiu: Centavos;
  investiu: Centavos;
  sobrou: Centavos;
  /** Faturas do mês que ainda não venceram: não entram no "Saiu" nem no "Sobrou". */
  aPagar: Centavos;
  /** Gastos por categoria, do maior para o menor; da 7ª em diante somadas em "Outros". */
  porCategoria: GastoPorCategoria[];
}

export interface GastoPorCategoria {
  categoria: string;
  total: Centavos;
  /** Porcentagem inteira do total que saiu no mês. */
  percentual: number;
}

/** Quantas categorias aparecem com cor própria nos gráficos (chart-1 … chart-6). */
export const MAX_CATEGORIAS = 6;

const FUSO = 'America/Sao_Paulo';
const anoMes = new Intl.DateTimeFormat('en-CA', { timeZone: FUSO, year: 'numeric', month: '2-digit' });

/** Mês do lançamento no horário de São Paulo, no formato "2026-11". */
export function mesDe(data: string): string {
  return anoMes.format(new Date(data)).slice(0, 7);
}

/**
 * Totais de um mês ("2026-11") pelo que passa na conta: o que entrou, saiu, foi investido e quanto sobrou.
 * A fatura do cartão sai no vencimento (`pagoEm`): conta no mês dele e, até `hoje` chegar lá, fica em
 * `aPagar`. "Gastos por categoria" já conta as compras da fatura do mês, pagas ou não.
 */
export function summarizeMonth(lancamentos: Lancamento[], mes: string, hoje?: string): ResumoDoMes {
  const doMes = lancamentos.filter((l) => (l.pagoEm ? l.pagoEm.slice(0, 7) : (l.mes ?? mesDe(l.data))) === mes);
  const pendente = (l: Lancamento) => !!hoje && !!l.pagoEm && l.pagoEm > hoje;
  const soma = (tipo: TipoLancamento, filtro: (l: Lancamento) => boolean = () => true) =>
    doMes.filter((l) => l.tipo === tipo && filtro(l)).reduce((t, l) => t + l.valor, 0);
  const entrou = soma('receita');
  const saiu = soma('despesa', (l) => !pendente(l));
  const aPagar = soma('despesa', pendente);
  const investiu = soma('investimento');
  return { entrou, saiu, investiu, sobrou: entrou - saiu - investiu, aPagar, porCategoria: gastosPorCategoria(doMes, saiu + aPagar) };
}

function gastosPorCategoria(lancamentos: Lancamento[], saiu: Centavos): GastoPorCategoria[] {
  const totais = new Map<string, Centavos>();
  for (const l of lancamentos) {
    if (l.tipo === 'despesa') totais.set(l.categoria, (totais.get(l.categoria) ?? 0) + l.valor);
  }
  const ordenado = [...totais].sort((a, b) => b[1] - a[1]);
  const principais = ordenado.slice(0, MAX_CATEGORIAS);
  const outros = ordenado.slice(MAX_CATEGORIAS).reduce((t, [, v]) => t + v, 0);
  if (outros > 0) principais.push(['Outros', outros]);
  return principais.map(([categoria, total]) => ({
    categoria,
    total,
    percentual: saiu === 0 ? 0 : Math.round((total / saiu) * 100),
  }));
}
