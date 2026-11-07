import { cn } from '@/lib/utils';

/** Seletor de opções exclusivas (design kit: Segmented), com rádios nativos que entram no formulário. */
export function Segmented<T extends string>({
  nome,
  rotulo,
  opcoes,
  valor,
  onChange,
}: {
  nome: string;
  rotulo: string;
  opcoes: { valor: T; rotulo: string }[];
  valor: T;
  onChange: (v: T) => void;
}) {
  return (
    <div role="radiogroup" aria-label={rotulo} className="grid auto-cols-fr grid-flow-col gap-0.5 rounded-md bg-muted p-[3px]">
      {opcoes.map((o) => (
        <label
          key={o.valor}
          className={cn(
            'grid min-h-10 cursor-pointer place-items-center rounded-[11px] text-sm font-bold text-muted-foreground has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ring',
            valor === o.valor && 'bg-popover text-foreground shadow-[0_1px_3px_rgba(12,18,32,0.12)]',
          )}
        >
          <input
            type="radio"
            name={nome}
            value={o.valor}
            checked={valor === o.valor}
            onChange={() => onChange(o.valor)}
            className="sr-only"
          />
          {o.rotulo}
        </label>
      ))}
    </div>
  );
}
