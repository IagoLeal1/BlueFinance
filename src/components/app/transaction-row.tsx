import { formatSigned } from '@/domain/money';
import type { LancamentoListado } from '@/server/lancamentos';
import { cn } from '@/lib/utils';
import { IconeCategoria } from './icone-categoria';

const COR = {
  despesa: { tile: 'bg-negative-soft text-negative', valor: 'text-negative' },
  receita: { tile: 'bg-positive-soft text-positive', valor: 'text-positive' },
  investimento: { tile: 'bg-invest-soft text-invest', valor: 'text-invest' },
} as const;

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
      <span className={cn('grid size-10 shrink-0 place-items-center rounded-[12px]', cor.tile)}>
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
