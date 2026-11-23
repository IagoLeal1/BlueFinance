'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { Delete } from 'lucide-react';
import { formatBRL } from '@/domain/money';

const MAX_DIGITOS = 11; // até R$ 999.999.999,99
const MAXIMO = 10 ** MAX_DIGITOS - 1;

/**
 * Valor em reais digitado como em caixa de banco (design-preview: .folha-valor):
 * cada dígito entra pela direita; apagar tira o último. Guarda centavos inteiros.
 * Com `teclado`, o valor se digita pelo teclado da folha, que abre logo abaixo do valor ao tocar nele
 * (o do iPhone não sobe por cima) e fecha em "Pronto", tocando de novo no valor ou indo para outro campo.
 * `tecladoAberto`: já abre aberto (o novo lançamento, onde o valor é a primeira coisa a digitar).
 */
export function AmountInput({
  centavos,
  onChange,
  nome,
  rotulo = 'Valor',
  teclado = false,
  tecladoAberto = false,
}: {
  centavos: number;
  onChange: (c: number) => void;
  nome: string;
  rotulo?: string;
  teclado?: boolean;
  tecladoAberto?: boolean;
}) {
  const [aberto, setAberto] = useState(tecladoAberto);
  const caixa = useRef<HTMLDivElement>(null);
  const idTeclado = useId();

  // Ir para outro campo (tocar ou focar fora do valor e do teclado) recolhe o teclado.
  useEffect(() => {
    if (!teclado || !aberto) return;
    const fora = (e: Event) => {
      if (e.target instanceof Node && !caixa.current?.contains(e.target)) setAberto(false);
    };
    // Só foco num outro campo conta: no Safari, tocar numa tecla devolve o foco para a própria folha.
    const focoFora = (e: FocusEvent) => {
      if (e.target instanceof Element && e.target.matches('input, textarea, select, button, a[href]')) fora(e);
    };
    document.addEventListener('pointerdown', fora);
    document.addEventListener('focusin', focoFora);
    return () => {
      document.removeEventListener('pointerdown', fora);
      document.removeEventListener('focusin', focoFora);
    };
  }, [teclado, aberto]);

  return (
    <div ref={caixa} className="grid justify-items-center gap-1 py-1">
      <input
        id={nome}
        aria-label={rotulo}
        inputMode={teclado ? 'none' : 'numeric'}
        autoComplete="off"
        value={formatBRL(centavos)}
        aria-live={teclado ? 'polite' : undefined}
        aria-controls={teclado ? idTeclado : undefined}
        onClick={teclado ? () => setAberto((v) => !v) : undefined}
        // O cursor fica sempre no fim: cada dígito entra pela direita, como na maquininha.
        onSelect={(e) => {
          const el = e.currentTarget;
          const fim = el.value.length;
          if (el.selectionStart !== fim || el.selectionEnd !== fim) el.setSelectionRange(fim, fim);
        }}
        onChange={(e) => {
          const digitos = e.target.value.replace(/\D/g, '').replace(/^0+/, '').slice(0, MAX_DIGITOS);
          onChange(Number(digitos || '0'));
        }}
        className="w-full cursor-pointer rounded-[20px] bg-transparent text-center font-valor text-[46px] leading-[52px] font-bold tracking-[-0.02em] tabular-nums caret-transparent transition-colors outline-none focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring data-[aberto=true]:bg-foreground/6 data-[vazio=true]:text-muted-foreground"
        data-vazio={centavos === 0}
        data-aberto={teclado && aberto}
      />
      <input type="hidden" name={nome} value={centavos} />
      {teclado && !aberto && <p className="text-[13px] leading-[18px] text-muted-foreground">Toque no valor para mudar</p>}
      {teclado && (
        // Abre e fecha com a mola calma (a altura vai de 0 ao conteúdo); fechado, sai do foco e do leitor de tela.
        <div
          id={idTeclado}
          className="grid w-full grid-rows-[0fr] transition-[grid-template-rows] duration-(--t-calma) ease-calma data-[aberto=true]:grid-rows-[1fr] motion-reduce:transition-none"
          data-aberto={aberto}
        >
          <div inert={!aberto} className={`overflow-hidden transition-[visibility] duration-(--t-calma) motion-reduce:transition-none ${aberto ? '' : 'invisible'}`}>
            <div className="grid gap-2 pt-2">
              <Teclado centavos={centavos} onChange={onChange} />
              <button
                type="button"
                onClick={() => setAberto(false)}
                className="pressiona h-11 rounded-full bg-foreground/9 text-[15px] font-semibold focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                Pronto
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const TECLAS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '00', '0', 'apagar'] as const;

/** Teclado numérico da folha (design-preview: .teclado): 1 a 9, 00, 0 e apagar. */
export function Teclado({ centavos, onChange }: { centavos: number; onChange: (c: number) => void }) {
  function tocar(t: (typeof TECLAS)[number]) {
    const novo = t === 'apagar' ? Math.floor(centavos / 10) : t === '00' ? centavos * 100 : centavos * 10 + Number(t);
    if (novo <= MAXIMO) onChange(novo);
  }
  return (
    <div role="group" aria-label="Teclado" className="grid grid-cols-3 gap-2">
      {TECLAS.map((t) => (
        <button
          key={t}
          type="button"
          onClick={() => tocar(t)}
          aria-label={t === 'apagar' ? 'Apagar dígito' : undefined}
          className="pressiona grid h-[46px] place-items-center rounded-md bg-foreground/8 font-valor text-2xl font-semibold focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          {t === 'apagar' ? <Delete className="size-6" aria-hidden /> : t}
        </button>
      ))}
    </div>
  );
}
