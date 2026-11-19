'use client';

import { Delete } from 'lucide-react';
import { formatBRL } from '@/domain/money';

const MAX_DIGITOS = 11; // até R$ 999.999.999,99
const MAXIMO = 10 ** MAX_DIGITOS - 1;

/**
 * Valor em reais digitado como em caixa de banco (design-preview: .folha-valor):
 * cada dígito entra pela direita; apagar tira o último. Guarda centavos inteiros.
 * Com `teclado`, o valor se digita pelo teclado da folha (<Teclado>) e o do iPhone não sobe por cima.
 */
export function AmountInput({
  centavos,
  onChange,
  nome,
  rotulo = 'Valor',
  teclado = false,
}: {
  centavos: number;
  onChange: (c: number) => void;
  nome: string;
  rotulo?: string;
  teclado?: boolean;
}) {
  return (
    <div className="grid justify-items-center gap-1 py-1">
      <input
        id={nome}
        aria-label={rotulo}
        inputMode={teclado ? 'none' : 'numeric'}
        autoComplete="off"
        value={formatBRL(centavos)}
        aria-live={teclado ? 'polite' : undefined}
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
        className="w-full rounded-md bg-transparent text-center font-valor text-[46px] leading-[52px] font-bold tracking-[-0.02em] tabular-nums caret-transparent outline-none focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring data-[vazio=true]:text-muted-foreground"
        data-vazio={centavos === 0}
      />
      <input type="hidden" name={nome} value={centavos} />
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
