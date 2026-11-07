import { parseBRL, type Centavos } from './money';

export interface GastoDigitado {
  valor: Centavos;
  descricao: string;
}

// Primeiro número do texto: "1.250", "32,90", "32.90", "41", "R$ 7,5".
const NUMERO = /(?:R\$\s*)?(\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?|\d+(?:[.,]\d{1,2})?)(?![\d.,])/;

/**
 * Lê o que foi digitado no Atalho ("32,90 mercado do bairro"): o primeiro número é o valor,
 * o resto é a descrição. Ponto com 1–2 casas no fim vale como vírgula ("32.90" = 32,90);
 * ponto seguido de 3 dígitos é milhar ("1.250" = 1.250,00). Sem valor maior que zero, devolve null.
 */
export function lerTextoRapido(texto: string): GastoDigitado | null {
  const m = NUMERO.exec(texto);
  if (!m) return null;

  const bruto = m[1]!;
  const brasileiro = /^\d+\.\d{1,2}$/.test(bruto) ? bruto.replace('.', ',') : bruto;
  const valor = parseBRL(brasileiro);
  if (!valor) return null;

  const descricao = (texto.slice(0, m.index) + ' ' + texto.slice(m.index + m[0].length)).replace(/\s+/g, ' ').trim();
  return { valor, descricao };
}
