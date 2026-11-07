import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Building2, Landmark, PiggyBank } from 'lucide-react';
import { NovoInvestimento } from '@/components/app/novo-investimento';
import { formatBRL } from '@/domain/money';
import { investimentosPorInstituicao } from '@/server/investimentos';

export const metadata: Metadata = { title: 'Investimentos · BlueFinance' };

const ICONE: Record<string, typeof Landmark> = { 'Renda fixa': Landmark, FII: Building2 };

export default function Investimentos() {
  return (
    <>
      <h1 className="mt-2 text-[28px] leading-[34px] font-extrabold tracking-tight">Investimentos</h1>
      <Suspense fallback={<p className="text-muted-foreground">Carregando…</p>}>
        <Carteira />
      </Suspense>
      <NovoInvestimento />
    </>
  );
}

async function Carteira() {
  const { total, grupos } = await investimentosPorInstituicao();
  return (
    <>
      <section aria-label="Patrimônio investido" className="rounded-lg bg-card p-5 shadow-card">
        <p className="text-[13px] leading-[18px] font-semibold text-muted-foreground">Patrimônio investido</p>
        <p className="mt-1 text-[40px] leading-[44px] font-extrabold tracking-[-0.02em] tabular-nums">{formatBRL(total)}</p>
      </section>
      {grupos.length === 0 && (
        <p className="rounded-lg bg-card p-5 text-center text-[13px] font-semibold text-muted-foreground shadow-card">
          Cadastre onde seu dinheiro está investido para acompanhar aqui.
        </p>
      )}
      {grupos.map((g) => (
        <section key={g.instituicao} aria-label={g.instituicao} className="rounded-lg bg-card px-4 pt-2 pb-1 shadow-card">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">{g.instituicao}</h2>
            <span className="text-[13px] font-semibold text-muted-foreground tabular-nums">{formatBRL(g.total)}</span>
          </div>
          <ul>
            {g.investimentos.map((i) => {
              const Icone = ICONE[i.tipo] ?? PiggyBank;
              return (
                <li key={i.id} className="flex min-h-16 items-center gap-3 py-3 not-first:border-t not-first:border-border">
                  <span className="grid size-10 shrink-0 place-items-center rounded-[12px] bg-invest-soft text-invest">
                    <Icone className="size-5" aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold">{i.nome}</p>
                    <p className="text-[13px] leading-[18px] font-semibold text-muted-foreground">{i.tipo}</p>
                  </div>
                  <span className="font-bold tabular-nums">{formatBRL(i.valorAtual)}</span>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </>
  );
}
