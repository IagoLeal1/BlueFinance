import { diaDe, mesAtual, somarMeses } from './datas';
import type { Centavos } from './money';
import { mesDe } from './summary';

/** Configuração do VR (vale-refeição): quanto cai por mês, em que dia, e desde quando o app conta os depósitos. */
export interface ConfigVr {
  valorMensal: Centavos;
  /** Dia do mês (1 a 31); em mês mais curto, cai no último dia. */
  dia: number;
  /** ISO 8601. O saldo informado nesse dia já inclui os depósitos até ele. */
  desde: string;
}

export interface DepositoVr {
  /** Mês do depósito ("2026-11"): um por mês. */
  competencia: string;
  /** Dia em que cai ("2026-11-05"). */
  dia: string;
  valor: Centavos;
}

const ultimoDia = (ano: number, mes: number) => new Date(Date.UTC(ano, mes, 0)).getUTCDate();

/** Dia em que o VR cai em `mes` ("2026-11"): o dia escolhido, ou o último do mês se ele for mais curto. */
export function diaDoDeposito(mes: string, dia: number): string {
  const [ano, m] = mes.split('-').map(Number) as [number, number];
  return `${mes}-${String(Math.min(dia, ultimoDia(ano, m))).padStart(2, '0')}`;
}

/**
 * Depósitos que já deviam ter caído: os dias do VR depois do dia em que foi configurado (o saldo informado
 * já tinha os anteriores) até hoje, inclusive (no horário de São Paulo).
 */
export function depositosDevidos(vr: ConfigVr, agora: Date = new Date()): DepositoVr[] {
  const desde = diaDe(vr.desde);
  const hoje = diaDe(agora);
  const lista: DepositoVr[] = [];
  for (let mes = mesDe(vr.desde); mes <= mesAtual(agora); mes = somarMeses(mes, 1)) {
    const dia = diaDoDeposito(mes, vr.dia);
    if (dia > desde && dia <= hoje) lista.push({ competencia: mes, dia, valor: vr.valorMensal });
  }
  return lista;
}

/** Próximo dia em que o VR cai, depois de hoje ("2026-12-05"). No dia do depósito, ele já caiu. */
export function proximoDeposito(dia: number, agora: Date = new Date()): string {
  const hoje = diaDe(agora);
  const neste = diaDoDeposito(mesAtual(agora), dia);
  return neste > hoje ? neste : diaDoDeposito(somarMeses(mesAtual(agora), 1), dia);
}

/** Saldo do VR: o que entrou nele (depósitos, saldo inicial, acertos) menos o que saiu (gastos, acertos). */
export function saldoDoVr(lancamentos: { tipo: string; valor: Centavos }[]): Centavos {
  return lancamentos.reduce((t, l) => t + (l.tipo === 'receita' ? l.valor : l.tipo === 'despesa' ? -l.valor : 0), 0);
}
