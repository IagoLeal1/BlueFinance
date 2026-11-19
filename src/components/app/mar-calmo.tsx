import { BARBATANA } from './marca';

/** Estado vazio (design-preview: .vazio): a linha d'água calma com a barbatana, "Mar calmo por aqui" e o porquê. */
export function MarCalmo({ children }: { children: React.ReactNode }) {
  return (
    <section aria-label="Mar calmo por aqui" className="grid justify-items-center gap-1 px-6 py-9 text-center">
      <svg viewBox="0 0 132 56" className="mb-2 h-14 w-[132px]" aria-hidden>
        <path d="M0 40Q16.5 32 33 40T66 40T99 40T132 40" fill="none" className="stroke-water" strokeWidth={2.5} strokeLinecap="round" />
        <path d={BARBATANA} transform="translate(47 12) scale(0.22)" className="fill-primary" />
        <path d="M8 50h116" className="stroke-border" strokeWidth={2} strokeLinecap="round" />
      </svg>
      <p className="text-[17px] leading-[22px] font-semibold">Mar calmo por aqui</p>
      <p className="max-w-[26ch] text-sm leading-[19px] text-muted-foreground">{children}</p>
    </section>
  );
}
