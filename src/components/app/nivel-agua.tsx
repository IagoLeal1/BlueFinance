import { BARBATANA } from './marca';

const ONDA = 'M0 10Q50 2 100 10T200 10T300 10T400 10T500 10T600 10T700 10T800 10';
const ONDA_FUNDO = 'M0 10Q50 0 100 10T200 10T300 10T400 10T500 10T600 10T700 10T800 10V20H0z';

/**
 * O nível de água do topo do Início (design-preview: .agua). A altura é a parte do que entrou que ainda
 * está na conta (0 a 100%); a água sobe ao abrir com a mola viva, as ondas correm devagar e a barbatana
 * fica na linha d'água, com a etiqueta do nível ao lado. Com "reduzir movimento", a onda fica parada.
 */
export function NivelAgua({ pct, rotulo }: { pct: number; rotulo?: string }) {
  return (
    <div
      aria-hidden
      style={{ '--pct': pct } as React.CSSProperties}
      className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] h-[calc(76px+var(--pct)*1.1px)] animate-agua-sobe bg-linear-to-b from-water/20 to-water/3 transition-[height] duration-(--t-viva) ease-viva motion-reduce:animate-aparece"
    >
      {rotulo && (
        <div className="absolute right-5 bottom-[calc(100%+14px)] flex animate-aparece-depois items-end gap-2 text-[13px] font-semibold text-white/90">
          <span className="vidro-claro relative rounded-full px-[11px] py-1">{rotulo}</span>
          <svg viewBox="26 30 126 88" className="-mb-3.5 h-5 w-[22px] fill-white">
            <path d={BARBATANA} />
          </svg>
        </div>
      )}
      <svg viewBox="0 0 800 20" preserveAspectRatio="none" className="absolute bottom-full left-0 -mb-px h-[22px] w-[200%] animate-mare-lenta opacity-45 motion-reduce:animate-none">
        <path d={ONDA_FUNDO} className="fill-water/20" />
      </svg>
      <svg viewBox="0 0 800 20" preserveAspectRatio="none" className="absolute bottom-full left-0 -mb-px h-4 w-[200%] animate-mare motion-reduce:animate-none">
        <path d={`${ONDA}V20H0z`} className="fill-water/20" />
        <path d={ONDA} fill="none" className="stroke-water" strokeWidth={2} vectorEffect="non-scaling-stroke" />
      </svg>
    </div>
  );
}
