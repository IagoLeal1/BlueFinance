'use client';

import { useSyncExternalStore } from 'react';

/** A partir desta largura o app usa o layout de Mac: barra lateral, duas colunas e folhas como diálogo. */
export const LARGURA_MAC = '(min-width: 1024px)';

function assinar(avisar: () => void) {
  const m = matchMedia(LARGURA_MAC);
  m.addEventListener('change', avisar);
  return () => m.removeEventListener('change', avisar);
}

/** true na largura de desktop (o servidor e a hidratação desenham o iPhone; o Mac entra logo depois). */
export function useMac() {
  return useSyncExternalStore(assinar, () => matchMedia(LARGURA_MAC).matches, () => false);
}
