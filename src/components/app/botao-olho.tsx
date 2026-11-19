'use client';

import { useSyncExternalStore } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { CHAVE_PRIVADO } from './privado';
import { VIDRO_DO_TOPO } from './topo-flutuante';

const MUDOU = 'bf:privado';

const escondido = () => document.documentElement.hasAttribute('data-privado');

function assinar(avisar: () => void) {
  // Outra aba do app trocou: acompanha.
  const deOutraAba = (e: StorageEvent) => {
    if (e.key !== CHAVE_PRIVADO) return;
    document.documentElement.toggleAttribute('data-privado', e.newValue === '1');
    avisar();
  };
  window.addEventListener(MUDOU, avisar);
  window.addEventListener('storage', deOutraAba);
  return () => {
    window.removeEventListener(MUDOU, avisar);
    window.removeEventListener('storage', deOutraAba);
  };
}

/** O olhinho: esconde ou mostra os valores com dinheiro do Início e do Investir. */
export function BotaoOlho() {
  const fechado = useSyncExternalStore(assinar, escondido, () => false);

  function alternar() {
    const fechar = !escondido();
    document.documentElement.toggleAttribute('data-privado', fechar);
    try {
      if (fechar) localStorage.setItem(CHAVE_PRIVADO, '1');
      else localStorage.removeItem(CHAVE_PRIVADO);
    } catch {
      // Sem armazenamento (aba privada): vale só até fechar.
    }
    window.dispatchEvent(new Event(MUDOU));
  }

  return (
    <button
      type="button"
      aria-label={fechado ? 'Mostrar valores' : 'Esconder valores'}
      onClick={alternar}
      className={`${VIDRO_DO_TOPO} grid size-11 place-items-center rounded-full`}
    >
      {fechado ? <EyeOff className="size-5" aria-hidden /> : <Eye className="size-5" aria-hidden />}
    </button>
  );
}
