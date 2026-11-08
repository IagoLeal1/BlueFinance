'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CreditCard } from 'lucide-react';
import { diaCurto, nomeDoMes } from '@/domain/datas';
import { formatBRL, formatSigned } from '@/domain/money';
import type { Cartao } from '@/server/cartoes';
import type { LancamentoListado } from '@/server/lancamentos';
import { Segmented } from './segmented';
import { LinhaAssinatura } from './editar-assinatura';
import { LinhaCompra } from './editar-compra';
import { LinhaEditavel, type CategoriaEditavel } from './editar-lancamento';
import { LancarTotalFatura } from './total-fatura';
import { useFeedback } from './feedback';
import { metaDe } from './meta';
import { TransactionRow } from './transaction-row';

export type Extrato = 'debito' | 'credito';
const EXTRATOS: { valor: Extrato; rotulo: string }[] = [
  { valor: 'debito', rotulo: 'Débito' },
  { valor: 'credito', rotulo: 'Crédito' },
];

/** O pagamento de uma fatura no extrato da conta: uma linha só, no dia do vencimento. */
export interface PagamentoFatura {
  id: string;
  cartao: string;
  /** Mês da fatura ("2026-11"); tocar abre o Crédito dele. */
  mesFatura: string;
  /** Dia do vencimento ("2026-11-11"). */
  vence: string;
  total: number;
  href: string;
}

export interface DiaDeLancamentos {
  rotulo: string;
  lancamentos: LancamentoListado[];
  faturas: PagamentoFatura[];
}

/** Compras no crédito de um cartão que caem na fatura do mês. */
export interface Fatura {
  id: string;
  nome: string;
  /** "Fecha dia 3 de dezembro" (sem cartão cadastrado: null). */
  fecha: string | null;
  total: number;
  lancamentos: LancamentoListado[];
  /** Fatura fechada sem nada lançado: dá para lançar o total de uma vez. */
  semCompras?: { cartao: { id: string; nome: string }; mes: string; fechou: number };
}

/** Linha "Fatura C6bank" no extrato da conta; abre as compras dela no Crédito. */
function LinhaPagamentoFatura({ f, aPagar }: { f: PagamentoFatura; aPagar: boolean }) {
  return (
    <li className="not-first:border-t not-first:border-border">
      <Link href={f.href} className="flex min-h-16 items-center gap-3 py-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-[12px] bg-negative-soft text-negative">
          <CreditCard className="size-5" aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-semibold">Fatura {f.cartao}</span>
          <span className="block text-[13px] leading-[18px] font-semibold text-muted-foreground">
            {aPagar ? `Crédito · vence ${diaCurto(`${f.vence}T12:00:00-03:00`)}` : `Crédito · fatura de ${nomeDoMes(f.mesFatura)}`}
          </span>
        </span>
        <span className="font-bold whitespace-nowrap tabular-nums text-negative">{formatSigned(f.total, 'despesa')}</span>
      </Link>
    </li>
  );
}

/**
 * Lançamentos do mês em dois extratos (design kit: TelaExtratoDebito e TelaExtratoCredito). "Débito" é a
 * conta: receitas, débito, Pix, aportes e cada fatura numa linha só, no vencimento ("A pagar" até lá).
 * "Crédito" são as compras no cartão, juntas no card da fatura de cada cartão.
 */
export function ListaLancamentos({
  extratoInicial,
  faturas,
  dias,
  aPagar,
  categorias,
  cartoes,
}: {
  extratoInicial: Extrato;
  faturas: Fatura[];
  dias: DiaDeLancamentos[];
  aPagar: PagamentoFatura[];
  categorias: CategoriaEditavel[];
  cartoes: Cartao[];
}) {
  const [extrato, setExtrato] = useState<Extrato>(extratoInicial);
  const { pendentes } = useFeedback();
  const noDebito = extrato === 'debito';
  const vazio = noDebito ? dias.length === 0 && aPagar.length === 0 && pendentes.length === 0 : faturas.length === 0;

  return (
    <>
      <Segmented nome="extrato" rotulo="Extrato" opcoes={EXTRATOS} valor={extrato} onChange={setExtrato} />
      {vazio && (
        <p className="rounded-lg bg-card p-5 text-center font-bold shadow-card">
          {noDebito ? 'Nenhum lançamento neste mês.' : 'Nenhuma compra no crédito neste mês.'}
        </p>
      )}
      {noDebito && pendentes.length > 0 && (
        <section aria-label="Salvando" className="rounded-lg bg-card px-4 pb-1 shadow-card">
          <ul>
            {pendentes.map((l) => (
              <TransactionRow key={l.id} l={l} meta={metaDe(l)} pendente />
            ))}
          </ul>
        </section>
      )}
      {noDebito && aPagar.length > 0 && (
        <section aria-label="A pagar" className="rounded-lg bg-card px-4 pb-1 shadow-card">
          <h2 className="pt-4 pb-1 text-xs font-bold tracking-[0.02em] text-muted-foreground">A pagar</h2>
          <ul>
            {aPagar.map((f) => (
              <LinhaPagamentoFatura key={f.id} f={f} aPagar />
            ))}
          </ul>
        </section>
      )}
      {!noDebito && faturas.map((f) => (
        <section key={f.id} aria-label={`Fatura ${f.nome}`} className="rounded-lg bg-card px-4 pt-3 pb-1 shadow-card">
          <div className="flex items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-[15px] font-extrabold">
              <CreditCard className="size-[18px] text-muted-foreground" aria-hidden />
              Fatura {f.nome}
            </h2>
            <span className="text-sm font-bold tabular-nums text-muted-foreground">{formatBRL(f.total)}</span>
          </div>
          {f.fecha && <p className="text-xs font-semibold text-muted-foreground">{f.fecha}</p>}
          {f.semCompras && (
            <div className="grid gap-1 py-2">
              <p className="text-sm font-semibold text-muted-foreground">As compras desta fatura são de antes de você usar o app.</p>
              <LancarTotalFatura cartao={f.semCompras.cartao} mes={f.semCompras.mes} fechou={f.semCompras.fechou} categorias={categorias} />
            </div>
          )}
          <ul>
            {f.lancamentos.map((l) =>
              l.recorrente ? (
                <LinhaAssinatura key={l.id} l={l} categorias={categorias} />
              ) : l.compraId ? (
                <LinhaCompra key={l.id} l={l} categorias={categorias} cartoes={cartoes} />
              ) : (
                <LinhaEditavel key={l.id} l={l} categorias={categorias} cartoes={cartoes} />
              ),
            )}
          </ul>
        </section>
      ))}
      {noDebito && dias.length > 0 && (
        <div className="rounded-lg bg-card px-4 pb-1 shadow-card">
          {dias.map((d) => (
            <section key={d.rotulo} aria-label={d.rotulo}>
              <h2 className="pt-4 pb-1 text-xs font-bold tracking-[0.02em] text-muted-foreground">{d.rotulo}</h2>
              <ul>
                {d.faturas.map((f) => (
                  <LinhaPagamentoFatura key={f.id} f={f} aPagar={false} />
                ))}
                {d.lancamentos.map((l) => (
                  <LinhaEditavel key={l.id} l={l} categorias={categorias} cartoes={cartoes} />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </>
  );
}
