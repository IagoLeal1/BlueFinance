import { mesDe } from './summary';

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

/** Mês atual no horário de São Paulo ("2026-11"). */
export function mesAtual(agora: Date = new Date()): string {
  return mesDe(agora.toISOString());
}

/** Nome do mês em minúsculas ("novembro"), como no meio de uma frase. */
export function nomeDoMes(mes: string): string {
  return MESES[Number(mes.slice(5, 7)) - 1]!;
}

/**
 * Início e fim do mês em São Paulo, para filtrar no banco.
 * O Brasil não tem horário de verão desde 2019, então o fuso é sempre -03:00.
 */
export function limitesDoMes(mes: string): { inicio: string; fim: string } {
  const [ano, m] = mes.split('-').map(Number) as [number, number];
  const prox = m === 12 ? `${ano + 1}-01` : `${ano}-${String(m + 1).padStart(2, '0')}`;
  return { inicio: `${mes}-01T00:00:00-03:00`, fim: `${prox}-01T00:00:00-03:00` };
}
