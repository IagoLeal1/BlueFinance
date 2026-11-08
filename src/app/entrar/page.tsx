import type { Metadata } from 'next';
import { NomeBlueFin, SimboloBlueFin } from '@/components/app/marca';
import { FormEntrar } from './form-entrar';

export const metadata: Metadata = { title: 'Entrar · BlueFinance' };

export default function Entrar() {
  return (
    <main className="mx-auto flex w-full max-w-[480px] flex-1 flex-col justify-center gap-8 px-4 py-8">
      <div className="grid justify-items-start gap-3">
        <SimboloBlueFin className="size-16 drop-shadow-[0_6px_16px_rgba(11,31,77,0.25)]" />
        <div>
          <h1 className="text-[40px] leading-[44px]">
            <NomeBlueFin />
            <span className="sr-only"> (BlueFinance)</span>
          </h1>
          <p className="mt-1 text-[13px] leading-[18px] font-semibold text-muted-foreground">Rápido como o atum-azul: lança em três toques.</p>
        </div>
      </div>
      <FormEntrar />
    </main>
  );
}
