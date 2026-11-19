'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { CircleCheck } from 'lucide-react';
import type { LancamentoListado } from '@/server/lancamentos';

export interface Aviso {
  texto: string;
  acao?: { rotulo: string; fazer: () => void };
}

interface Feedback {
  /** Lançamentos já mostrados na lista enquanto o servidor salva ("salvando…"). */
  pendentes: LancamentoListado[];
  adicionarPendente: (l: LancamentoListado) => void;
  removerPendente: (id: string) => void;
  avisar: (aviso: Aviso) => void;
}

const Contexto = createContext<Feedback | null>(null);

export function useFeedback(): Feedback {
  const f = useContext(Contexto);
  if (!f) throw new Error('useFeedback precisa estar dentro de <FeedbackProvider>.');
  return f;
}

const DURACAO_AVISO_MS = 5000;

/** Interface otimista e aviso com Desfazer (design kit: Fluidez · bf-toast, bf-row--pending). */
export function FeedbackProvider({ children }: { children: React.ReactNode }) {
  const [pendentes, setPendentes] = useState<LancamentoListado[]>([]);
  const [aviso, setAviso] = useState<Aviso | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const avisar = useCallback((a: Aviso) => {
    setAviso(a);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setAviso(null), DURACAO_AVISO_MS);
  }, []);
  useEffect(() => () => clearTimeout(timer.current), []);

  const adicionarPendente = useCallback((l: LancamentoListado) => setPendentes((p) => [l, ...p]), []);
  const removerPendente = useCallback((id: string) => setPendentes((p) => p.filter((l) => l.id !== id)), []);

  return (
    <Contexto.Provider value={{ pendentes, adicionarPendente, removerPendente, avisar }}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-[calc(max(calc(env(safe-area-inset-bottom)-8px),12px)+74px)] z-50 mx-auto flex max-w-[480px] justify-center px-4">
        {aviso && (
          <div
            role="status"
            className="vidro-forte pointer-events-auto relative flex min-h-12 animate-chega items-center gap-3 rounded-[24px] py-1 pr-2 pl-4 text-[15px] font-medium motion-reduce:animate-aparece"
          >
            <CircleCheck className="size-5 shrink-0 text-positive" aria-hidden />
            <span className="py-2">{aviso.texto}</span>
            {aviso.acao && (
              <button
                type="button"
                onClick={() => {
                  const fazer = aviso.acao!.fazer;
                  setAviso(null);
                  fazer();
                }}
                className="pressiona ml-auto min-h-11 rounded-[18px] px-3.5 font-semibold text-primary focus-visible:outline-3 focus-visible:outline-ring"
              >
                {aviso.acao.rotulo}
              </button>
            )}
          </div>
        )}
      </div>
    </Contexto.Provider>
  );
}
