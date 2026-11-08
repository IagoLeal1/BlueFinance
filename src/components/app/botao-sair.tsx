'use client';

import { Button } from '@/components/ui/button';
import { limparFila } from './fila-offline';

/** Sair: antes, apaga deste aparelho a fila de envios e as telas guardadas para abrir sem internet. */
export function BotaoSair() {
  return (
    <Button
      type="submit"
      variant="ghost"
      className="-ml-5 text-negative"
      onClick={() => {
        limparFila();
        if ('caches' in window) caches.keys().then((nomes) => nomes.forEach((n) => caches.delete(n)));
      }}
    >
      Sair
    </Button>
  );
}
