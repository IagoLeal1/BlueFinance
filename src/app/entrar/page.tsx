import type { Metadata } from 'next';
import { FormEntrar } from './form-entrar';

export const metadata: Metadata = { title: 'Entrar · BlueFinance' };

export default function Entrar() {
  return (
    <main className="mx-auto flex w-full max-w-[480px] flex-1 flex-col justify-center gap-8 px-4 py-8">
      <div>
        <p className="text-[28px] leading-[34px] font-extrabold tracking-tight">BlueFinance</p>
        <p className="mt-1 text-[13px] leading-[18px] font-semibold text-muted-foreground">Suas finanças em um toque.</p>
      </div>
      <FormEntrar />
    </main>
  );
}
