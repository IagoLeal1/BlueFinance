import { formatSigned } from '@/domain/money';
import type { LancamentoListado } from '@/server/lancamentos';
import { cn } from '@/lib/utils';
import { IconeCategoria } from './icone-categoria';

const COR = {
  despesa: { tile: 'bg-muted text-muted-foreground', valor: 'text-negative' },
  receita: { tile: 'bg-positive-soft text-positive', valor: 'text-positive' },
  investimento: { tile: 'bg-invest-soft text-invest', valor: 'text-invest' },
} as const;

/**
 * Gastos: o fundo do ícone tem a cor da categoria (a mesma dos gráficos, pela ordem 1 a 6); Outros, Fatura e
 * as demais ficam neutros. O valor segue vermelho: a cor diz "o quê", o sinal diz "saiu".
 */
const COR_DA_CATEGORIA = [
  'bg-cat-1-soft text-cat-1',
  'bg-cat-2-soft text-cat-2',
  'bg-cat-3-soft text-cat-3',
  'bg-cat-4-soft text-cat-4',
  'bg-cat-5-soft text-cat-5',
  'bg-cat-6-soft text-cat-6',
];
/** Fatura (o cartão): as cores da marca, Abismo com o ícone em Água — diferente do cinza de Outros. */
export const FUNDO_DA_FATURA = 'bg-hero text-water';
export const fundoDoIcone = (l: Pick<LancamentoListado, 'tipo' | 'ordemCategoria' | 'categoria'>) =>
  l.tipo === 'despesa' && l.categoria === 'Fatura'
    ? FUNDO_DA_FATURA
    : l.tipo === 'despesa' && l.ordemCategoria && l.ordemCategoria <= 6
      ? COR_DA_CATEGORIA[l.ordemCategoria - 1]!
      : COR[l.tipo].tile;

/** Linha de um lançamento (design kit: TransactionRow). */
export function TransactionRow({
  l,
  meta,
  como = 'li',
  pendente = false,
}: {
  l: LancamentoListado;
  meta: string;
  como?: 'li' | 'div';
  pendente?: boolean;
}) {
  const Tag = como;
  const cor = COR[l.tipo];
  return (
    <Tag className={cn('flex min-h-16 items-center gap-3 py-3', como === 'li' && 'not-first:border-t not-first:border-border', pendente && 'opacity-60')}>
      <span className={cn('grid size-10 shrink-0 place-items-center rounded-[12px]', fundoDoIcone(l))}>
        <IconeCategoria nome={l.icone} className="size-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold">{l.descricao}</p>
        <p className="text-[13px] leading-[18px] font-semibold text-muted-foreground">
          {meta}
          {pendente && ' · salvando…'}
        </p>
      </div>
      <span className={cn('font-bold whitespace-nowrap tabular-nums', cor.valor)}>{formatSigned(l.valor, l.tipo)}</span>
    </Tag>
  );
}
