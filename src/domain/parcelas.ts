import { diaDe, somarMeses } from './datas';
import type { Centavos } from './money';

/** Divide o total em `n` parcelas de centavos inteiros; o que sobra da divisão vai na 1ª. */
export function dividirParcelas(total: Centavos, n: number): Centavos[] {
  const base = Math.floor(total / n);
  const resto = total - base * n;
  return Array.from({ length: n }, (_, i) => (i === 0 ? base + resto : base));
}

const ultimoDia = (ano: number, mes: number) => new Date(Date.UTC(ano, mes, 0)).getUTCDate();

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

/** Mês de cada parcela, começando pela fatura da 1ª. */
export function mesesDasParcelas(primeiro: string, n: number): string[] {
  return Array.from({ length: n }, (_, i) => somarMeses(primeiro, i));
}
