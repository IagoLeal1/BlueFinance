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

const MES_VALIDO = /^\d{4}-(0[1-9]|1[0-2])$/;

/** Mês da URL (?mes=2026-10) se for válido e não estiver no futuro; senão o mês atual. */
export function mesDaUrl(valor: string | string[] | undefined, agora: Date = new Date()): string {
  const atual = mesAtual(agora);
  return typeof valor === 'string' && MES_VALIDO.test(valor) && valor <= atual ? valor : atual;
}

/** Os últimos `n` meses, do atual para trás ("2026-11", "2026-10", …). */
export function mesesRecentes(agora: Date = new Date(), n = 12): string[] {
  let [ano, mes] = mesAtual(agora).split('-').map(Number) as [number, number];
  const lista: string[] = [];
  for (let i = 0; i < n; i++) {
    lista.push(`${ano}-${String(mes).padStart(2, '0')}`);
    mes -= 1;
    if (mes === 0) {
      mes = 12;
      ano -= 1;
    }
  }
  return lista;
}

/** Nome para título: "Novembro" no ano corrente, "Dezembro de 2025" em outro ano. */
export function tituloDoMes(mes: string, agora: Date = new Date()): string {
  const nome = nomeDoMes(mes);
  const capitalizado = nome[0]!.toUpperCase() + nome.slice(1);
  return mes.slice(0, 4) === mesAtual(agora).slice(0, 4) ? capitalizado : `${capitalizado} de ${mes.slice(0, 4)}`;
}

/** Opções do seletor de mês: os últimos 12, com o ano por extenso ("Outubro de 2026"). */
export function opcoesDeMes(agora: Date = new Date()): { mes: string; titulo: string }[] {
  return mesesRecentes(agora).map((m) => {
    const nome = nomeDoMes(m);
    return { mes: m, titulo: `${nome[0]!.toUpperCase()}${nome.slice(1)} de ${m.slice(0, 4)}` };
  });
}
