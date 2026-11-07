'use client';

import { formatBRL } from '@/domain/money';

const MAX_DIGITOS = 11; // até R$ 999.999.999,99

/**
 * Valor em reais digitado como em caixa de banco (design kit: AmountInput):
 * cada dígito entra pela direita; apagar tira o último. Guarda centavos inteiros.
 */
export function AmountInput({ centavos, onChange, nome }: { centavos: number; onChange: (c: number) => void; nome: string }) {
  return (
    <div className="grid justify-items-center gap-1 py-2">
      <input
        id="valor"
        aria-label="Valor"
        inputMode="numeric"
        autoComplete="off"
        value={formatBRL(centavos)}
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
        className="w-full bg-transparent text-center text-[40px] leading-[44px] font-extrabold tracking-[-0.02em] tabular-nums outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring rounded-md data-[vazio=true]:text-muted-foreground"
        data-vazio={centavos === 0}
      />
      <input type="hidden" name={nome} value={centavos} />
    </div>
  );
}
