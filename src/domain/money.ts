/** Valores de dinheiro são sempre centavos inteiros (BRL). */
export type Centavos = number;

export type TipoLancamento = 'despesa' | 'receita' | 'investimento';

export function formatBRL(centavos: Centavos): string {
  const reais = String(Math.floor(centavos / 100)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const cents = String(centavos % 100).padStart(2, '0');
  return `R$ ${reais},${cents}`;
}

const VALOR_BR = /^(\d{1,3}(?:\.\d{3})+|\d+)(?:,(\d{1,2}))?$/;

/**
 * Lê um valor digitado em formato brasileiro ("1.234,56", "32", "R$ 7,5") e devolve centavos.
 * Devolve null quando o texto não é um valor válido (vazio, negativo, letras, separador errado).
 */
export function parseBRL(texto: string): Centavos | null {
  const m = VALOR_BR.exec(texto.replace(/R\$/g, '').trim());
  if (!m) return null;
  const reais = Number(m[1]!.replace(/\./g, ''));
  const cents = Number((m[2] ?? '').padEnd(2, '0'));
  return reais * 100 + cents;
}

const SINAL: Record<TipoLancamento, string> = { despesa: '\u2212 ', receita: '+ ', investimento: '' };

/** Valor com o sinal do tipo: despesa "− R$ 32,90", receita "+ R$ 850,00", investimento sem sinal. */
export function formatSigned(centavos: Centavos, tipo: TipoLancamento): string {
  return SINAL[tipo] + formatBRL(centavos);
}

/** Teclado de valor estilo caixa de banco: o dígito novo entra pela direita (0,03 → 0,32 → 3,29). */
export function pushDigit(centavos: Centavos, digito: string): Centavos {
  return centavos * 10 + Number(digito);
}

const milhar = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.');

/** Valor arredondado para reais inteiros, para cards pequenos: "R$ 9.350". */
export function formatReais(centavos: Centavos): string {
  return `R$ ${milhar(Math.round(centavos / 100))}`;
}
