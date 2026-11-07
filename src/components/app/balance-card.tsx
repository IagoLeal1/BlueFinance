import { ArrowDownLeft, ArrowUpRight, PiggyBank } from 'lucide-react';
import { formatBRL, formatReais } from '@/domain/money';
import type { ResumoDoMes } from '@/domain/summary';

/** Card de resumo do mês (design kit: BalanceCard). */
export function BalanceCard({ resumo, nomeMes }: { resumo: ResumoDoMes; nomeMes: string }) {
  const stats = [
    { rotulo: 'Entrou', valor: resumo.entrou, Icone: ArrowDownLeft, cor: 'text-positive' },
    { rotulo: 'Saiu', valor: resumo.saiu, Icone: ArrowUpRight, cor: 'text-negative' },
    { rotulo: 'Investiu', valor: resumo.investiu, Icone: PiggyBank, cor: 'text-invest' },
  ];
  return (
    <section aria-label={`Resumo de ${nomeMes}`} className="rounded-lg bg-card p-5 shadow-card">
      <p className="text-[13px] leading-[18px] font-semibold text-muted-foreground">Sobrou em {nomeMes}</p>
      <p className="mt-1 mb-4 text-[40px] leading-[44px] font-extrabold tracking-[-0.02em] tabular-nums">
        {formatBRL(resumo.sobrou)}
      </p>
      <div className="grid grid-cols-3 gap-2">
        {stats.map(({ rotulo, valor, Icone, cor }) => (
          <div key={rotulo} className="rounded-md bg-muted p-3">
            <p className="flex items-center gap-1 text-xs font-semibold text-muted-foreground">
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
