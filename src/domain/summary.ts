import type { Centavos, TipoLancamento } from './money';

/** Como foi pago. "vr" é o vale-refeição: um saldo separado da conta. */
export type FormaPagamento = 'debito' | 'pix' | 'credito' | 'vr';

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
  /** No VR (gasto pago com ele, depósito, acerto), fica fora de Entrou, Saiu e Sobrou: o VR tem saldo próprio. */
  forma?: FormaPagamento | null;
  /** "vr": o depósito do mês no VR; "acerto": saldo inicial ou correção do VR — não é gasto de categoria nenhuma. */
  origem?: 'app' | 'atalho' | 'vr' | 'acerto';
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
  /** Porcentagem inteira do total gasto no mês. */
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
 * O lançamento conta em `mes`? Pelo dia em que o dinheiro sai (`pagoEm`, a fatura no vencimento); senão, pelo
 * mês de competência ou o da data. É o mesmo critério do resumo e de "Gastos por categoria".
 */
export function noMes(l: Lancamento, mes: string): boolean {
  return (l.pagoEm ? l.pagoEm.slice(0, 7) : (l.mes ?? mesDe(l.data))) === mes;
}

/** Gasto de alguma categoria: despesa que não é acerto do saldo do VR. Pago com VR também conta. */
const ehGasto = (l: Lancamento) => l.tipo === 'despesa' && l.origem !== 'acerto';

/**
 * Totais de um mês ("2026-11") pelo que passa na conta: o que entrou, saiu, foi investido e quanto sobrou.
 * A fatura do cartão sai no vencimento (`pagoEm`): conta no mês dele e, até `hoje` chegar lá, fica em
 * `aPagar`. O VR fica de fora (tem saldo próprio). "Gastos por categoria" conta as compras da fatura do mês,
 * pagas ou não, e os gastos pagos com VR.
 */
export function summarizeMonth(lancamentos: Lancamento[], mes: string, hoje?: string): ResumoDoMes {
  const doMes = lancamentos.filter((l) => noMes(l, mes));
  const daConta = doMes.filter((l) => l.forma !== 'vr');
  const pendente = (l: Lancamento) => !!hoje && !!l.pagoEm && l.pagoEm > hoje;
  const soma = (tipo: TipoLancamento, filtro: (l: Lancamento) => boolean = () => true) =>
    daConta.filter((l) => l.tipo === tipo && filtro(l)).reduce((t, l) => t + l.valor, 0);
  const entrou = soma('receita');
  const saiu = soma('despesa', (l) => !pendente(l));
  const aPagar = soma('despesa', pendente);
  const investiu = soma('investimento');
  return { entrou, saiu, investiu, sobrou: entrou - saiu - investiu, aPagar, porCategoria: gastosPorCategoria(doMes.filter(ehGasto)) };
}

function gastosPorCategoria(gastos: Lancamento[]): GastoPorCategoria[] {
  const totais = new Map<string, Centavos>();
  for (const l of gastos) totais.set(l.categoria, (totais.get(l.categoria) ?? 0) + l.valor);
  const gastou = gastos.reduce((t, l) => t + l.valor, 0);
  const ordenado = [...totais].sort((a, b) => b[1] - a[1]);
  const principais = ordenado.slice(0, MAX_CATEGORIAS);
  const outros = ordenado.slice(MAX_CATEGORIAS).reduce((t, [, v]) => t + v, 0);
  if (outros > 0) principais.push(['Outros', outros]);
  return principais.map(([categoria, total]) => ({ categoria, total, percentual: porcento(total, gastou) }));
}

const porcento = (parte: Centavos, todo: Centavos) => (todo === 0 ? 0 : Math.round((parte / todo) * 100));

export interface GastosDaCategoria {
  categoria: string;
  total: Centavos;
  /** Quantos gastos (cada parcela conta como um). */
  quantidade: number;
  /** Porcentagem inteira do total gasto no mês. */
  percentual: number;
  /** Quanto foi em Débito e Pix, no Crédito e no VR. */
  porForma: { debitoPix: Centavos; credito: Centavos; vr: Centavos };
}

/**
 * Quanto foi gasto numa categoria no mês, de qualquer jeito que foi pago (design kit: TelaFiltroCategoria).
 * Mesmo critério de "Gastos por categoria": as compras no crédito contam no mês da fatura.
 */
export function gastosDaCategoria(lancamentos: Lancamento[], mes: string, categoria: string): GastosDaCategoria {
  const gastos = lancamentos.filter((l) => ehGasto(l) && noMes(l, mes));
  const daCategoria = gastos.filter((l) => l.categoria === categoria);
  const soma = (filtro: (l: Lancamento) => boolean) => daCategoria.filter(filtro).reduce((t, l) => t + l.valor, 0);
  const total = soma(() => true);
  return {
    categoria,
    total,
    quantidade: daCategoria.length,
    percentual: porcento(total, gastos.reduce((t, l) => t + l.valor, 0)),
    porForma: {
      debitoPix: soma((l) => l.forma !== 'credito' && l.forma !== 'vr'),
      credito: soma((l) => l.forma === 'credito'),
      vr: soma((l) => l.forma === 'vr'),
    },
  };
}
