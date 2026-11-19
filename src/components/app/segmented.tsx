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
    <div role="radiogroup" aria-label={rotulo} className="grid auto-cols-fr grid-flow-col gap-0.5 rounded-full bg-foreground/9 p-[3px]">
      {opcoes.map((o) => (
        <label
          key={o.valor}
          className={cn(
            'grid min-h-11 cursor-pointer place-items-center rounded-full px-2 text-[15px] font-semibold text-muted-foreground transition-[background-color,color] duration-200 has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ring',
            valor === o.valor && 'bg-surface text-foreground shadow-[inset_0_1px_0_var(--glass-shine),0_2px_8px_rgb(4_12_32/0.18)]',
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
