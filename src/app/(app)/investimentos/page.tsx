import type { Metadata } from 'next';
import { Suspense } from 'react';
import { EsqueletoCarteira } from '@/components/app/esqueleto';
import { LinhaInvestimento } from '@/components/app/linha-investimento';
import { NovoInvestimento } from '@/components/app/novo-investimento';
import { formatBRL, formatReais } from '@/domain/money';
import { investimentosPorInstituicao } from '@/server/investimentos';

export const metadata: Metadata = { title: 'Investimentos · BlueFinance' };

export default function Investimentos() {
  return (
    <>
      <h1 className="mt-2 text-[28px] leading-[34px] font-extrabold tracking-tight">Investimentos</h1>
      <Suspense fallback={<EsqueletoCarteira />}>
        <Carteira />
      </Suspense>
    </>
  );
}

async function Carteira() {
  const { total, aportado, grupos } = await investimentosPorInstituicao();
  const rendeu = total - aportado;
  return (
    <>
      <section aria-label="Patrimônio investido" className="rounded-lg bg-card p-5 shadow-card">
        <p className="text-[13px] leading-[18px] font-semibold text-muted-foreground">Patrimônio investido</p>
        <p className="mt-1 mb-4 text-[40px] leading-[44px] font-extrabold tracking-[-0.02em] tabular-nums">{formatBRL(total)}</p>
        <div className="grid grid-cols-2 gap-2">
          <div role="group" aria-label="Aportado" className="rounded-md bg-muted p-3">
            <p aria-hidden className="text-xs font-semibold text-muted-foreground">Aportado</p>
            <p className="mt-0.5 font-extrabold tabular-nums">{formatReais(aportado)}</p>
          </div>
          <div role="group" aria-label="Rendeu" className="rounded-md bg-muted p-3">
            <p aria-hidden className="text-xs font-semibold text-muted-foreground">Rendeu</p>
            <p className={`mt-0.5 font-extrabold tabular-nums ${rendeu > 0 ? 'text-positive' : rendeu < 0 ? 'text-negative' : ''}`}>
              {rendeu > 0 ? '+ ' : ''}
              {formatReais(rendeu)}
            </p>
          </div>
        </div>
      </section>
      <NovoInvestimento />
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
            {g.investimentos.map((i) => (
              <LinhaInvestimento key={i.id} i={i} />
            ))}
          </ul>
        </section>
      ))}
    </>
  );
}
