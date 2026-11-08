import { ArrowDownLeft, ArrowUpRight, PiggyBank } from 'lucide-react';
import { formatBRL, formatReais } from '@/domain/money';
import type { ResumoDoMes } from '@/domain/summary';
import { LinhaDagua } from './marca';

/**
 * Topo do Início (design kit: Identidade A · BlueFin): título e saldo sobre o degradê Abismo → Atum,
 * de ponta a ponta da tela, com a linha d'água no pé; Entrou, Saiu e Investiu logo abaixo.
 */
export function BalanceCard({ resumo, nomeMes, topo }: { resumo: ResumoDoMes; nomeMes: string; topo?: React.ReactNode }) {
  const stats = [
    { rotulo: 'Entrou', valor: resumo.entrou, Icone: ArrowDownLeft, cor: 'text-positive' },
    { rotulo: 'Saiu', valor: resumo.saiu, Icone: ArrowUpRight, cor: 'text-negative' },
    { rotulo: 'Investiu', valor: resumo.investiu, Icone: PiggyBank, cor: 'text-invest' },
  ];
  return (
    <section aria-label={`Resumo de ${nomeMes}`} className="grid gap-3">
      <div className="relative -mx-4 -mt-[max(env(safe-area-inset-top),16px)] bg-linear-to-br from-hero to-hero-end px-4 pt-[calc(max(env(safe-area-inset-top),16px)+8px)] pb-11 text-on-hero">
        {topo}
        <p className="mt-5 text-[13px] leading-[18px] font-semibold text-on-hero/80">Sobrou em {nomeMes}</p>
        <p className="mt-1 text-[40px] leading-[44px] font-extrabold tracking-[-0.02em] tabular-nums">{formatBRL(resumo.sobrou)}</p>
        <LinhaDagua className="absolute inset-x-0 -bottom-px h-6 w-full text-background" />
      </div>
      <div className="grid grid-cols-3 gap-2">
        {stats.map(({ rotulo, valor, Icone, cor }) => (
          <div key={rotulo} role="group" aria-label={rotulo} className="rounded-md bg-card p-3 shadow-card">
            <p aria-hidden className="flex items-center gap-1 text-xs font-semibold text-muted-foreground">
              <Icone className={`size-3.5 ${cor}`} aria-hidden />
              {rotulo}
            </p>
            <p className="mt-0.5 text-base font-extrabold tabular-nums">{formatReais(valor)}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
