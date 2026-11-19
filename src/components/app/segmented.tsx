import { cn } from '@/lib/utils';

/**
 * Seletor de opções exclusivas (design-preview: .seg), com rádios nativos que entram no formulário.
 * `deslizante`: um polegar de vidro desliza com a mola ágil até a opção marcada (os extratos de Lançamentos).
 */
export function Segmented<T extends string>({
  nome,
  rotulo,
  opcoes,
  valor,
  onChange,
  deslizante = false,
}: {
  nome: string;
  rotulo: string;
  opcoes: { valor: T; rotulo: string }[];
  valor: T;
  onChange: (v: T) => void;
  deslizante?: boolean;
}) {
  const marcada = Math.max(0, opcoes.findIndex((o) => o.valor === valor));
  return (
    <div
      role="radiogroup"
      aria-label={rotulo}
      style={deslizante ? ({ '--i': marcada, '--n': opcoes.length } as React.CSSProperties) : undefined}
      className="relative grid auto-cols-fr grid-flow-col gap-0.5 rounded-full bg-foreground/9 p-[3px]"
    >
      {deslizante && (
        <span
          aria-hidden
          className="absolute inset-y-[3px] left-[3px] w-[calc((100%-6px)/var(--n))] translate-x-[calc(var(--i)*100%)] rounded-full bg-surface shadow-[inset_0_1px_0_var(--glass-shine),0_2px_8px_rgb(4_12_32/0.18)] transition-transform duration-(--t-agil) ease-agil motion-reduce:transition-none"
        />
      )}
      {opcoes.map((o) => (
        <label
          key={o.valor}
          className={cn(
            'relative grid min-h-11 cursor-pointer place-items-center rounded-full px-2 text-[15px] font-semibold text-muted-foreground transition-[background-color,color] duration-200 has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ring',
            valor === o.valor && 'text-foreground',
            valor === o.valor && !deslizante && 'bg-surface shadow-[inset_0_1px_0_var(--glass-shine),0_2px_8px_rgb(4_12_32/0.18)]',
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
