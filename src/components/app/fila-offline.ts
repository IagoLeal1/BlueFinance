import type { LancamentoListado } from '@/server/lancamentos';

/**
 * Fila no aparelho dos lançamentos ainda não confirmados pelo servidor. Cada um vai para a fila antes de
 * ser enviado e sai quando o servidor responde; o que sobrar (app fechado sem internet) é reenviado na
 * próxima abertura — com o mesmo id, o servidor não duplica.
 */
export interface ItemDaFila {
  id: string;
  campos: [string, string][];
  /** Linha "salvando…" (débito, Pix, receita). */
  pendente?: LancamentoListado;
  /** Texto do aviso quando salvar ("Gasto salvo · − R$ 18,40"). */
  aviso: string;
}

const CHAVE = 'bf:fila';

export function lerFila(): ItemDaFila[] {
  try {
    return JSON.parse(localStorage.getItem(CHAVE) ?? '[]') as ItemDaFila[];
  } catch {
    return [];
  }
}

export function guardarNaFila(item: ItemDaFila) {
  localStorage.setItem(CHAVE, JSON.stringify([...lerFila().filter((i) => i.id !== item.id), item]));
}

export function tirarDaFila(id: string) {
  localStorage.setItem(CHAVE, JSON.stringify(lerFila().filter((i) => i.id !== id)));
}

export function limparFila() {
  localStorage.removeItem(CHAVE);
}

export function formDaFila(item: ItemDaFila): FormData {
  const form = new FormData();
  for (const [nome, valor] of item.campos) form.append(nome, valor);
  return form;
}
