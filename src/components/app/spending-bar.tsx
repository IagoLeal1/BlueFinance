import Link from 'next/link';
import { formatBRL } from '@/domain/money';
import type { GastoPorCategoria } from '@/domain/summary';

/** Fatura (o total de uma fatura, sem detalhe): Céu, liso (design kit: TelaCoresCategoria). */
const COR_DA_FATURA = 'var(--chart-fatura)';

/** Cor fixa por categoria (chart-1 … chart-6 pela ordem da categoria); Fatura em Céu; o resto é "Outros". */
export function corDaCategoria(nome: string, ordemPorNome: Map<string, number>): string {
  if (nome === 'Fatura') return COR_DA_FATURA;
  const ordem = ordemPorNome.get(nome);
  return ordem && ordem <= 6 ? `var(--chart-${ordem})` : 'var(--chart-other)';
}

/**
 * Gastos do mês por categoria (design-preview: .barra e .cats): a barra segmentada se desenha da esquerda,
 * um segmento depois do outro, e embaixo cada categoria com a cor, o nome, a % e o valor.
 */
export function SpendingBar({
  gastos,
  ordemPorNome,
  maxLegenda = Infinity,
  hrefDe,
  className,
}: {
  gastos: GastoPorCategoria[];
  ordemPorNome: Map<string, number>;
  maxLegenda?: number;
  /** Tocar numa categoria abre Lançamentos filtrado nela (design kit: TelaFiltroCategoria). */
  hrefDe?: (categoria: string) => string;
  className?: string;
}) {
  if (gastos.length === 0) return null;
  const descricao = gastos.map((g) => `${g.categoria} ${g.percentual}%`).join(', ');
  return (
    <section aria-label="Gastos por categoria" className={`cartao p-4 ${className ?? ''}`}>
      <h2 className="text-[17px] leading-[22px] font-semibold">Gastos por categoria</h2>
      <div role="img" aria-label={descricao} className="mt-3.5 flex h-3.5 gap-[3px]">
        {gastos.map((g, n) => (
          <span
            key={g.categoria}
            title={`${g.categoria} · ${formatBRL(g.total)}`}
            style={{ flex: g.total, background: corDaCategoria(g.categoria, ordemPorNome), animationDelay: `${n * 55 + 250}ms` }}
            className="origin-left animate-desenha rounded-[4px] first:rounded-l-[7px] last:rounded-r-[7px] motion-reduce:animate-aparece"
          />
        ))}
      </div>
      <ul className="mt-2 lg:grid lg:grid-cols-2 lg:gap-x-9">
        {gastos.slice(0, maxLegenda).map((g) => (
          <li key={g.categoria} className="not-first:border-t not-first:border-border lg:border-t lg:border-border">
            <Legenda href={hrefDe?.(g.categoria)}>
              <span className="size-2.5 rounded-[3px]" style={{ background: corDaCategoria(g.categoria, ordemPorNome) }} />
              <span className="font-medium">{g.categoria}</span>
              <span className="text-[13px] text-muted-foreground tabular-nums">{g.percentual}%</span>
              <span className="text-right font-valor font-semibold tabular-nums">{formatBRL(g.total)}</span>
            </Legenda>
          </li>
        ))}
      </ul>
    </section>
  );
}

const LINHA = 'grid min-h-12 grid-cols-[10px_1fr_auto_minmax(84px,auto)] items-center gap-3 text-[15px]';
function Legenda({ href, children }: { href?: string; children: React.ReactNode }) {
  return href ? (
    <Link href={href} className={`${LINHA} pressiona rounded-[12px] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring`}>
      {children}
    </Link>
  ) : (
    <div className={LINHA}>{children}</div>
  );
}
