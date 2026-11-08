import { diaDe, somarMeses } from './datas';
import type { Centavos } from './money';

/** Divide o total em `n` parcelas de centavos inteiros; o que sobra da divisão vai na 1ª. */
export function dividirParcelas(total: Centavos, n: number): Centavos[] {
  const base = Math.floor(total / n);
  const resto = total - base * n;
  return Array.from({ length: n }, (_, i) => (i === 0 ? base + resto : base));
}

const ultimoDia = (ano: number, mes: number) => new Date(Date.UTC(ano, mes, 0)).getUTCDate();

/** Dia em que a fatura de `mes` ("2026-02") fecha: o dia do cartão, ou o último dia se o mês for mais curto. */
export function diaDoFechamento(mes: string, diaFechamento: number): number {
  const [ano, m] = mes.split('-').map(Number) as [number, number];
  return Math.min(diaFechamento, ultimoDia(ano, m));
}

/**
 * Mês da fatura em que cai uma compra no crédito (horário de São Paulo).
 * Compra até a véspera do fechamento entra na fatura do mês; a partir do dia do fechamento,
 * na seguinte. Fechamento 31 em mês curto vale como o último dia do mês.
 */
export function mesDaFatura(dataCompra: string, diaFechamento: number): string {
  const [ano, mes, dia] = diaDe(dataCompra).split('-').map(Number) as [number, number, number];
  const fechamento = Math.min(diaFechamento, ultimoDia(ano, mes));
  const mesCompra = `${ano}-${String(mes).padStart(2, '0')}`;
  return dia >= fechamento ? somarMeses(mesCompra, 1) : mesCompra;
}

/** Vencimento padrão de um cartão: uma semana depois do fechamento (fecha 3 → vence 10). */
export const vencimentoPadrao = (diaFechamento: number) => ((diaFechamento + 6) % 31) + 1;

/** Mês de cada parcela, começando pela fatura da 1ª. */
export function mesesDasParcelas(primeiro: string, n: number): string[] {
  return Array.from({ length: n }, (_, i) => somarMeses(primeiro, i));
}

export interface FaturasDoCartao {
  /** Fatura que está recebendo as compras de hoje ("2026-12"). */
  aberta: string;
  /** A anterior, já fechada, enquanto não passa do vencimento (dia "2026-11-10"); depois, null. */
  fechada: { mes: string; vence: string } | null;
}

/**
 * Faturas de um cartão hoje: a aberta e a fechada a pagar. A fatura de um mês fecha no dia de fechamento
 * dele e vence no dia de vencimento do mesmo mês — ou do seguinte, se o vencimento vem antes do fechamento
 * (fecha 25, vence 5). Dia 31 em mês curto vale o último dia.
 */
export function faturasDoCartao(hoje: string, diaFechamento: number, diaVencimento: number): FaturasDoCartao {
  const aberta = mesDaFatura(hoje, diaFechamento);
  const mes = somarMeses(aberta, -1);
  const mesVence = diaVencimento > diaFechamento ? mes : somarMeses(mes, 1);
  const [ano, m] = mesVence.split('-').map(Number) as [number, number];
  const vence = `${mesVence}-${String(Math.min(diaVencimento, ultimoDia(ano, m))).padStart(2, '0')}`;
  return { aberta, fechada: diaDe(hoje) <= vence ? { mes, vence } : null };
}
