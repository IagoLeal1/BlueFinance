'use client';

import { useSyncExternalStore } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';

import { CHAVE_PRIVADO } from './privado';

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
export function BotaoOlho({ sobreODegrade = false }: { sobreODegrade?: boolean }) {
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
    <Button
      size="icon"
      variant="ghost"
      aria-label={fechado ? 'Mostrar valores' : 'Esconder valores'}
      onClick={alternar}
      className={sobreODegrade ? 'bg-white/15 text-on-hero hover:bg-white/25' : undefined}
    >
      {fechado ? <EyeOff aria-hidden /> : <Eye aria-hidden />}
    </Button>
  );
}
