import { formatBRL } from '@/domain/money';
import type { GastoPorCategoria } from '@/domain/summary';

/**
 * Fatura (o total de uma fatura, sem detalhe): listrada nas cores da marca, Atum e Água (design kit:
 * TelaCoresCategoria). As listras a separam de Moradia, que é azul liso.
 */
const LISTRAS = 'repeating-linear-gradient(45deg, var(--hero-end) 0 4px, var(--water) 4px 7px)';

/** Cor fixa por categoria (chart-1 … chart-6 pela ordem da categoria); Fatura listrada; o resto é "Outros". */
export function corDaCategoria(nome: string, ordemPorNome: Map<string, number>): string {
  if (nome === 'Fatura') return LISTRAS;
  const ordem = ordemPorNome.get(nome);
  return ordem && ordem <= 6 ? `var(--chart-${ordem})` : 'var(--chart-other)';
}

/** Gastos do mês por categoria: barra segmentada + legenda com valor e % (design kit: SpendingBar). */
export function SpendingBar({
  gastos,
  ordemPorNome,
  maxLegenda = 3,
}: {
  gastos: GastoPorCategoria[];
  ordemPorNome: Map<string, number>;
  maxLegenda?: number;
}) {
  if (gastos.length === 0) return null;
  const descricao = gastos.map((g) => `${g.categoria} ${g.percentual}%`).join(', ');
  return (
    <section aria-label="Gastos por categoria" className="rounded-lg bg-card p-4 shadow-card">
      <h2 className="mb-3 text-lg font-bold">Gastos por categoria</h2>
      <div role="img" aria-label={descricao} className="mb-3 flex h-3.5 gap-0.5 overflow-hidden rounded-[4px]">
        {gastos.map((g) => (
          <span
            key={g.categoria}
            title={`${g.categoria} · ${formatBRL(g.total)}`}
            style={{ flex: g.total, background: corDaCategoria(g.categoria, ordemPorNome) }}
          />
        ))}
      </div>
      <ul className="grid gap-2">
        {gastos.slice(0, maxLegenda).map((g) => (
          <li key={g.categoria} className="grid grid-cols-[10px_1fr_auto_44px] items-center gap-2 text-sm font-semibold">
            <span className="size-2.5 rounded-[3px]" style={{ background: corDaCategoria(g.categoria, ordemPorNome) }} />
            <span>{g.categoria}</span>
            <span className="tabular-nums">{formatBRL(g.total)}</span>
            <span className="text-right text-muted-foreground tabular-nums">{g.percentual}%</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
