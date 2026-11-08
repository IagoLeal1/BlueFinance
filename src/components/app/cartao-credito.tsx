import Link from 'next/link';
import { ChevronRight, CreditCard } from 'lucide-react';
import { nomeDoMes } from '@/domain/datas';
import { formatBRL, formatReais } from '@/domain/money';
import type { ResumoDoCartao } from '@/server/cartoes';

/** Uma fatura do cartão, que abre Lançamentos no mês dela. */
function LinhaFatura({ mes, meta, total, mesAtual }: { mes: string; meta: string; total: number; mesAtual: string }) {
  return (
    <li className="not-first:border-t not-first:border-border">
      <Link href={mes === mesAtual ? '/lancamentos' : `/lancamentos?mes=${mes}`} className="flex min-h-14 items-center gap-3 py-2">
        <span className="min-w-0 flex-1">
          <span className="block font-bold">Fatura de {nomeDoMes(mes)}</span>
          <span className="block text-[13px] leading-[18px] font-semibold text-muted-foreground">{meta}</span>
        </span>
        <span className="font-extrabold tabular-nums">{formatBRL(total)}</span>
        <ChevronRight className="size-5 text-muted-foreground" aria-hidden />
      </Link>
    </li>
  );
}

/**
 * Card do Início (design kit: TelaInicioCredito): de cada cartão, a fatura fechada a pagar e a aberta,
 * e embaixo o que já está comprometido em parcelas depois delas.
 */
export function CartaoCredito({
  resumos,
  aVir,
  mesAtual,
}: {
  resumos: ResumoDoCartao[];
  aVir: { total: number; ultimoMes: string | null };
  mesAtual: string;
}) {
  return (
    <section aria-label="Cartão de crédito" className="grid gap-1 rounded-lg bg-card px-4 pt-3 pb-2 shadow-card">
      {resumos.map(({ cartao, aberta, fechada }) => (
        <div key={cartao.id}>
          <h2 className="flex items-center gap-2 text-lg font-bold">
            <CreditCard className="size-5 text-muted-foreground" aria-hidden />
            {cartao.nome}
          </h2>
          <ul>
            {fechada && (
              <LinhaFatura mes={fechada.mes} meta={`Fechada · vence dia ${Number(fechada.vence.slice(8))}`} total={fechada.total} mesAtual={mesAtual} />
            )}
            <LinhaFatura mes={aberta.mes} meta={`Aberta · fecha dia ${aberta.fecha}`} total={aberta.total} mesAtual={mesAtual} />
          </ul>
        </div>
      ))}
      {aVir.total > 0 && aVir.ultimoMes && (
        <p className="pb-1 text-xs font-semibold text-muted-foreground">
          Mais {formatReais(aVir.total)} em parcelas até {nomeDoMes(aVir.ultimoMes)}
        </p>
      )}
    </section>
  );
}
