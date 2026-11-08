import { formatBRL } from './money';

export interface FaturaParaAviso {
  cartao: string;
  /** Mês da fatura ("2026-11"). */
  mes: string;
  /** Dia do vencimento ("2026-11-11"). */
  vence: string;
  total: number;
}

export interface Aviso {
  titulo: string;
  corpo: string;
  /** Onde o toque na notificação leva: o Crédito do mês da fatura. */
  url: string;
}

const diaSeguinte = (dia: string) => new Date(Date.parse(`${dia}T12:00:00Z`) + 86_400_000).toISOString().slice(0, 10);

/**
 * Avisos da fatura para mandar hoje (design kit: TelaAvisosOffline): um dia antes e no dia do vencimento,
 * só para fatura com valor.
 */
export function avisosDeFatura(faturas: FaturaParaAviso[], hoje: string): Aviso[] {
  const amanha = diaSeguinte(hoje);
  return faturas
    .filter((f) => f.total > 0 && (f.vence === hoje || f.vence === amanha))
    .map((f) => ({
      titulo: 'BlueFin',
      corpo:
        f.vence === hoje
          ? `Hoje vence a fatura do ${f.cartao}: ${formatBRL(f.total)}`
          : `A fatura do ${f.cartao} vence amanhã: ${formatBRL(f.total)}`,
      url: `/lancamentos?mes=${f.mes}&ver=credito`,
    }));
}
