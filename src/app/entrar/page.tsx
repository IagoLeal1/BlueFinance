import type { Metadata } from 'next';
import { BARBATANA } from '@/components/app/marca';
import { NivelAgua } from '@/components/app/nivel-agua';
import { FormEntrar } from './form-entrar';

export const metadata: Metadata = { title: 'Entrar · BlueFinance' };

/** Entrar (design-preview: .entrar): o degradê da marca de ponta a ponta, a água no pé e o formulário em vidro claro. */
export default function Entrar() {
  return (
    <main className="relative grid min-h-dvh flex-1 content-center overflow-hidden bg-[linear-gradient(160deg,var(--hero)_10%,var(--hero-end))] px-7 pt-[max(env(safe-area-inset-top),24px)] pb-[max(env(safe-area-inset-bottom),60px)] text-on-hero">
      <NivelAgua pct={100} />
      <div className="relative z-[2] mx-auto grid w-full max-w-[360px] gap-3.5">
        <svg viewBox="26 30 126 88" className="h-10 w-11 fill-white" aria-hidden>
          <path d={BARBATANA} />
        </svg>
        <h1 className="-mt-1 text-[44px] leading-none font-bold tracking-[-0.03em]">
          blue<span className="text-water">fin</span>
          <span className="sr-only"> (BlueFinance)</span>
        </h1>
        <p className="mb-3.5 text-[17px] leading-[22px] text-white/88">Seu dinheiro, na linha d&apos;água.</p>
        <FormEntrar />
      </div>
    </main>
  );
}
