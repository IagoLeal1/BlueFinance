'use client';

import { useEffect } from 'react';
import { useOffline } from 'next/offline';
import { WifiOff } from 'lucide-react';
import { criarLancamento } from '@/app/(app)/actions';
import { formDaFila, lerFila, tirarDaFila } from './fila-offline';
import { useFeedback } from './feedback';

/** Faixa "Sem internet" no topo, de vidro forte (design-preview: .faixa-offline). */
export function AvisoSemInternet() {
  const semInternet = useOffline();
  if (!semInternet) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 top-[max(env(safe-area-inset-top),8px)] z-50 mx-auto max-w-[480px] px-4">
      <div role="status" className="vidro-forte relative flex min-h-11 items-center gap-2.5 rounded-[16px] px-3.5 py-2 text-sm leading-[19px] font-medium">
        <WifiOff className="size-5 shrink-0 text-alert" aria-hidden />
        Sem internet. Mostrando o que você viu por último; o que lançar sobe quando ela voltar.
      </div>
    </div>
  );
}

/** Ao abrir o app, reenvia o que ficou na fila de uma abertura anterior (ex.: fechado sem internet). */
export function ReenviarFila() {
  const { adicionarPendente, removerPendente, avisar } = useFeedback();
  useEffect(() => {
    for (const item of lerFila()) {
      if (item.pendente) adicionarPendente(item.pendente);
      criarLancamento({}, formDaFila(item)).then(
        (r) => {
          tirarDaFila(item.id);
          if (item.pendente) removerPendente(item.id);
          avisar({ texto: r.ok ? item.aviso : `Não salvou: ${r.erro ?? 'tente de novo.'}` });
        },
        () => {},
      );
    }
  }, [adicionarPendente, removerPendente, avisar]);
  return null;
}
