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

const diaSP = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' });
const MESES_CURTOS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

/** Dia em São Paulo no formato "2026-11-07". */
export function diaDe(data: string | Date): string {
  return diaSP.format(new Date(data));
}

/** Rótulo do dia para agrupar a lista: "Hoje · 7 nov", "Ontem · 6 nov", "5 nov", "24 dez 2025". */
export function rotuloDoDia(data: string, agora: Date = new Date()): string {
  const dia = diaDe(data);
  const [ano, mes, d] = dia.split('-').map(Number) as [number, number, number];
  const curto = `${d} ${MESES_CURTOS[mes - 1]}`;
  const hoje = diaDe(agora);
  const ontem = diaDe(new Date(new Date(`${hoje}T12:00:00-03:00`).getTime() - 86_400_000));
  if (dia === hoje) return `Hoje · ${curto}`;
  if (dia === ontem) return `Ontem · ${curto}`;
  return ano === Number(hoje.slice(0, 4)) ? curto : `${curto} ${ano}`;
}
