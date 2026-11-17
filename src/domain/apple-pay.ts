/**
 * Apple Pay pela automação "Carteira" do app Atalhos (design kit: TelaApplePay). Ao encostar o iPhone ou o Watch, o
 * Atalho manda o valor, o nome do lugar e o cartão; o gasto entra na hora com a categoria e o nome aprendidos para
 * aquele lugar, ou numa categoria sugerida e "a confirmar".
 */

export type FormaDaCarteira = 'debito' | 'credito' | 'vr';

/**
 * Valor em centavos a partir do que o Atalho manda: número em reais (8.5) ou o texto como o iPhone mostra
 * ("R$ 1.234,56"). Sinal é ignorado (um gasto é sempre positivo no app). Zero ou ilegível: null.
 */
export function lerValorEmReais(valor: unknown): number | null {
  let reais: number;
  if (typeof valor === 'number') {
    reais = valor;
  } else if (typeof valor === 'string') {
    const limpo = valor.replace(/[^\d,.]/g, '');
    if (!/\d/.test(limpo)) return null;
    // Com vírgula, é o jeito brasileiro (ponto separa milhar); sem vírgula, o ponto é decimal.
    reais = Number(limpo.includes(',') ? limpo.replace(/\./g, '').replace(',', '.') : limpo);
  } else {
    return null;
  }
  const centavos = Math.round(Math.abs(reais) * 100);
  return Number.isSafeInteger(centavos) && centavos > 0 ? centavos : null;
}

const VALE = /\bVR\b|vale|refei|alimenta|alelo|pluxee|sodexo|ticket|flash|caju|swile/i;

/** Forma de um cartão da Carteira visto pela primeira vez (dá para trocar em Ajustes › Apple Pay). */
export function formaDoCartao(nome: string): FormaDaCarteira {
  const semAcento = nome.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (/credito/i.test(semAcento)) return 'credito';
  if (VALE.test(semAcento)) return 'vr';
  return 'debito';
}

/** Nome do lugar como a Carteira mostra; tudo em maiúsculas vira só a primeira letra de cada palavra. */
export function nomeDoLugar(lugar: string): string {
  const nome = lugar.trim().replace(/\s+/g, ' ');
  if (!nome) return 'Apple Pay';
  if (nome !== nome.toUpperCase()) return nome;
  return nome
    .toLowerCase()
    .split(' ')
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(' ');
}

/** Lançamento recente que pode ser o mesmo pagamento. */
export interface JaLancado {
  id: string;
  valor: number;
  forma: string | null;
  data: string;
  parcela: number | null;
  parcelas: number | null;
  origem: string;
}

const JANELA = 30 * 60_000;

/**
 * O gasto que você já lançou pelo Atalho (ou pelo app) para este pagamento: mesmo valor, mesma forma (débito e Pix
 * valem igual), nos últimos 30 minutos; o mais recente ganha. No crédito, só compra à vista.
 */
export function acharLancadoAgora(
  alvo: { valor: number; forma: FormaDaCarteira; agora: Date },
  candidatos: JaLancado[],
): string | null {
  const combina = (l: JaLancado) => {
    if (l.origem !== 'atalho' && l.origem !== 'app') return false;
    if (l.valor !== alvo.valor) return false;
    const distancia = alvo.agora.getTime() - Date.parse(l.data);
    if (distancia > JANELA || distancia < -5 * 60_000) return false;
    if (alvo.forma === 'debito') return l.forma === 'debito' || l.forma === 'pix';
    if (alvo.forma === 'credito') return l.forma === 'credito' && (l.parcela ?? 1) === 1 && (l.parcelas ?? 1) === 1;
    return l.forma === 'vr';
  };
  const achados = candidatos.filter(combina).sort((a, b) => Date.parse(b.data) - Date.parse(a.data));
  return achados[0]?.id ?? null;
}
