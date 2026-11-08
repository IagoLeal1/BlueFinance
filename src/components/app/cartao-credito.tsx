import Link from 'next/link';
import { CreditCard } from 'lucide-react';
import { nomeDoMes } from '@/domain/datas';
import { formatReais } from '@/domain/money';
import { diaDoFechamento } from '@/domain/parcelas';
import type { Cartao } from '@/server/cartoes';

/**
 * Card do Início (design kit: TelaInicioCredito): quanto do mês é fatura do cartão e quanto
 * já está comprometido em parcelas nos meses seguintes.
 */
export function CartaoCredito({
  mes,
  fatura,
  aVir,
  cartoes,
  href,
}: {
  mes: string;
  fatura: number;
  aVir: { total: number; ultimoMes: string | null; compras: number };
  cartoes: Cartao[];
  href: string;
}) {
  const fechamentos = cartoes.map((c) => `${c.nome} fecha dia ${diaDoFechamento(mes, c.diaFechamento)}`);
  const parceladas =
    aVir.compras > 0 && aVir.ultimoMes
      ? [`${aVir.compras} ${aVir.compras === 1 ? 'compra parcelada' : 'compras parceladas'} até ${nomeDoMes(aVir.ultimoMes)}`]
      : [];
  const stats = [
    { rotulo: `Fatura de ${nomeDoMes(mes)}`, valor: fatura },
    { rotulo: 'Parcelas a vir', valor: aVir.total },
  ];
  return (
    <section aria-label="Cartão de crédito" className="grid gap-2.5 rounded-lg bg-card p-4 shadow-card">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-lg font-bold">
          <CreditCard className="size-5 text-muted-foreground" aria-hidden />
          Cartão de crédito
        </h2>
        <Link href={href} className="text-sm font-bold text-primary">
          Ver fatura
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {stats.map(({ rotulo, valor }) => (
          <div key={rotulo} role="group" aria-label={rotulo} className="rounded-md bg-muted p-3">
            <p aria-hidden className="text-xs font-semibold text-muted-foreground">
              {rotulo}
            </p>
            <p className="mt-0.5 text-base font-extrabold tabular-nums">{formatReais(valor)}</p>
          </div>
        ))}
      </div>
      <p className="text-xs font-semibold text-muted-foreground">{[...fechamentos, ...parceladas].join(' · ')}</p>
    </section>
  );
}
