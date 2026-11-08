'use client';

/** Contador com − e + (design kit: Stepper). O texto do meio é anunciado a cada mudança. */
export function Stepper({
  valor,
  min,
  max,
  onChange,
  rotulo,
  grupo,
}: {
  valor: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
  rotulo: (v: number) => string;
  /** Nome do grupo, quando há mais de um contador na mesma tela ("Dia do vencimento"). */
  grupo?: string;
}) {
  const botao =
    'grid size-11 place-items-center rounded-[11px] bg-popover text-xl font-extrabold text-foreground disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring';
  return (
    <div role={grupo ? 'group' : undefined} aria-label={grupo} className="grid grid-cols-[44px_1fr_44px] items-center gap-2 rounded-md bg-muted p-1">
      <button type="button" aria-label="Menos" className={botao} disabled={valor <= min} onClick={() => onChange(Math.max(min, valor - 1))}>
        −
      </button>
      <span role="status" className="text-center text-lg font-extrabold tabular-nums">
        {rotulo(valor)}
      </span>
      <button type="button" aria-label="Mais" className={botao} disabled={valor >= max} onClick={() => onChange(Math.min(max, valor + 1))}>
        +
      </button>
    </div>
  );
}
