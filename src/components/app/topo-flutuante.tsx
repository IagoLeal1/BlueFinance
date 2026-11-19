'use client';

import { useSyncExternalStore } from 'react';
import { LARGURA_MAC } from './use-mac';

/** Até onde a tela rola com o degradê do topo do Início ainda atrás dos botões. */
const FIM_DO_DEGRADE = 300;

function assinar(avisar: () => void) {
  const mac = matchMedia(LARGURA_MAC);
  window.addEventListener('scroll', avisar, { passive: true });
  mac.addEventListener('change', avisar);
  return () => {
    window.removeEventListener('scroll', avisar);
    mac.removeEventListener('change', avisar);
  };
}

/**
 * Botões do topo (olhinho, mês) flutuando no canto direito enquanto a tela rola (design-preview: .topo-fixo).
 * Sobre o degradê do Início eles são de vidro claro; sobre o conteúdo, de vidro regular. Os botões leem o
 * modo por `group-data-claro/topo`.
 */
export function TopoFlutuante({ sobreODegrade = false, children }: { sobreODegrade?: boolean; children: React.ReactNode }) {
  const claro = useSyncExternalStore(
    assinar,
    // No Mac os botões ficam sobre a coluna da direita, fora do degradê.
    () => sobreODegrade && window.scrollY < FIM_DO_DEGRADE && !matchMedia(LARGURA_MAC).matches,
    () => sobreODegrade,
  );
  return (
    <div data-topo className="sticky top-0 z-30 -mb-3 h-0 lg:top-6">
      <div
        data-claro={claro || undefined}
        className="group/topo absolute top-[calc(max(env(safe-area-inset-top),16px)+2px)] right-0 flex gap-2 lg:top-0"
      >
        {children}
      </div>
    </div>
  );
}

/** Classes do vidro dos botões do topo: claro sobre o degradê, regular sobre o conteúdo. */
export const VIDRO_DO_TOPO =
  'vidro pressiona relative text-foreground transition-[background-color,color] duration-200 group-data-claro/topo:vidro-claro focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-ring';
