import { ArrowDownLeft, ArrowUpRight, TrendingUp } from 'lucide-react';
import { formatBRL, formatReais } from '@/domain/money';
import type { ResumoDoMes } from '@/domain/summary';
import { ContagemValor } from './contagem-valor';
import { NivelAgua } from './nivel-agua';
import { Privado } from './privado';

/** A parte do que entrou que ainda está na conta (sobrou ÷ entrou), entre 0 e 100%. */
export function nivelDoMes({ sobrou, entrou }: Pick<ResumoDoMes, 'sobrou' | 'entrou'>): number {
  if (entrou <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((sobrou / entrou) * 100)));
}

/**
 * Topo do Início (design-preview: .heroi): o degradê Abismo → Atum de ponta a ponta, com o título, o saldo
 * que conta ao abrir e o nível de água, que sobe até a parte do que entrou que ainda está na conta, com a
 * barbatana na linha d'água. Entrou, Saiu e Investiu ficam dentro do topo, sobre a água.
 */
export function BalanceCard({
  resumo,
  nomeMes,
  topo,
  depois,
}: {
  resumo: ResumoDoMes;
  nomeMes: string;
  topo?: React.ReactNode;
  /** "Depois da fatura do C6bank (dia 11): R$ …" — quando há fatura do mês ainda a pagar. */
  depois?: { texto: string; valor: number };
}) {
  const pct = nivelDoMes(resumo);
  const stats = [
    { rotulo: 'Entrou', valor: resumo.entrou, Icone: ArrowDownLeft },
    { rotulo: 'Saiu', valor: resumo.saiu, Icone: ArrowUpRight },
    { rotulo: 'Investiu', valor: resumo.investiu, Icone: TrendingUp },
  ];
  return (
    <section
      aria-label={`Resumo de ${nomeMes}`}
      className="relative -mx-4 -mt-[max(env(safe-area-inset-top),16px)] min-h-[calc(max(env(safe-area-inset-top),16px)+372px)] overflow-hidden rounded-b-xl bg-[linear-gradient(160deg,var(--hero)_10%,var(--hero-end))] px-5 pt-[calc(max(env(safe-area-inset-top),16px)+6px)] pb-[88px] text-on-hero lg:col-start-1 lg:row-span-3 lg:mx-0 lg:mt-0 lg:min-h-[420px] lg:self-stretch lg:rounded-[28px] lg:px-6 lg:pt-[26px]"
    >
      <div className="relative z-[2]">
        {topo}
        <p className="mt-[26px] text-[15px] leading-5 font-medium text-white/82">Sobrou na conta</p>
        <p className="mt-0.5 font-valor text-[50px] leading-[56px] font-bold tracking-[-0.02em] tabular-nums">
          <Privado>
            <ContagemValor centavos={resumo.sobrou} />
          </Privado>
        </p>
        {depois && (
          <p className="mt-1.5 text-sm leading-[19px] font-medium">
            {depois.texto}:{' '}
            <b className="font-valor font-semibold tabular-nums">
              <Privado>{formatBRL(depois.valor)}</Privado>
            </b>
          </p>
        )}
      </div>
      <NivelAgua pct={pct} rotulo={resumo.entrou > 0 ? `${pct}% do que entrou` : undefined} />
      <div className="absolute inset-x-2 bottom-3 z-[2] grid grid-cols-3">
        {stats.map(({ rotulo, valor, Icone }) => (
          <div key={rotulo} role="group" aria-label={rotulo} className="px-3 not-first:border-l not-first:border-white/22">
            <p aria-hidden className="flex items-center gap-[5px] text-[13px] leading-[18px] font-medium">
              <Icone className="size-[15px]" aria-hidden />
              {rotulo}
            </p>
            <p className="mt-0.5 font-valor text-lg leading-6 font-bold tabular-nums">
              <Privado mascara="••••">{formatReais(valor)}</Privado>
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
