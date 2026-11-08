'use client';

import { useState } from 'react';
import { CreditCard } from 'lucide-react';
import { formatBRL, type TipoLancamento } from '@/domain/money';
import type { Cartao } from '@/server/cartoes';
import type { LancamentoListado } from '@/server/lancamentos';
import { Segmented } from './segmented';
import { LinhaCompra } from './editar-compra';
import { LinhaEditavel, type CategoriaEditavel } from './editar-lancamento';
import { useFeedback } from './feedback';
import { metaDe } from './meta';
import { TransactionRow } from './transaction-row';

type Filtro = 'tudo' | TipoLancamento;
const FILTROS: { valor: Filtro; rotulo: string }[] = [
  { valor: 'tudo', rotulo: 'Tudo' },
  { valor: 'despesa', rotulo: 'Saiu' },
  { valor: 'receita', rotulo: 'Entrou' },
  { valor: 'investimento', rotulo: 'Investiu' },
];

export interface DiaDeLancamentos {
  rotulo: string;
  lancamentos: LancamentoListado[];
}

/** Compras no crédito de um cartão que caem na fatura do mês. */
export interface Fatura {
  id: string;
  nome: string;
  /** "Fecha dia 3 de dezembro" (sem cartão cadastrado: null). */
  fecha: string | null;
  total: number;
  lancamentos: LancamentoListado[];
}

/**
 * Lista do mês, com filtro por tipo (design kit: TelaLancamentos e TelaFatura): as compras no crédito
 * ficam juntas no card da fatura de cada cartão; o resto segue agrupado por dia.
 */
export function ListaLancamentos({
  faturas,
  dias,
  categorias,
  cartoes,
}: {
  faturas: Fatura[];
  dias: DiaDeLancamentos[];
  categorias: CategoriaEditavel[];
  cartoes: Cartao[];
}) {
  const [filtro, setFiltro] = useState<Filtro>('tudo');
  const { pendentes } = useFeedback();
  const visiveis = dias
    .map((d) => ({ ...d, lancamentos: d.lancamentos.filter((l) => filtro === 'tudo' || l.tipo === filtro) }))
    .filter((d) => d.lancamentos.length > 0);
  const faturasVisiveis = filtro === 'tudo' || filtro === 'despesa' ? faturas : [];

  return (
    <>
      <Segmented nome="filtro" rotulo="Filtro" opcoes={FILTROS} valor={filtro} onChange={setFiltro} />
      {pendentes.length > 0 && (
        <section aria-label="Salvando" className="rounded-lg bg-card px-4 pb-1 shadow-card">
          <ul>
            {pendentes.map((l) => (
              <TransactionRow key={l.id} l={l} meta={metaDe(l)} pendente />
            ))}
          </ul>
        </section>
      )}
      {faturasVisiveis.map((f) => (
        <section key={f.id} aria-label={`Fatura ${f.nome}`} className="rounded-lg bg-card px-4 pt-3 pb-1 shadow-card">
          <div className="flex items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-[15px] font-extrabold">
              <CreditCard className="size-[18px] text-muted-foreground" aria-hidden />
              Fatura {f.nome}
            </h2>
            <span className="text-sm font-bold tabular-nums text-muted-foreground">{formatBRL(f.total)}</span>
          </div>
          {f.fecha && <p className="text-xs font-semibold text-muted-foreground">{f.fecha}</p>}
          <ul>
            {f.lancamentos.map((l) =>
              l.compraId ? <LinhaCompra key={l.id} l={l} categorias={categorias} cartoes={cartoes} /> : <LinhaEditavel key={l.id} l={l} categorias={categorias} cartoes={cartoes} />,
            )}
          </ul>
        </section>
      ))}
      {visiveis.length === 0 && pendentes.length === 0 && faturasVisiveis.length === 0 ? (
        <p className="rounded-lg bg-card p-5 text-center font-bold shadow-card">Nenhum lançamento neste mês.</p>
      ) : visiveis.length === 0 ? null : (
        <div className="rounded-lg bg-card px-4 pb-1 shadow-card">
          {visiveis.map((d) => (
            <section key={d.rotulo} aria-label={d.rotulo}>
              <h2 className="pt-4 pb-1 text-xs font-bold tracking-[0.02em] text-muted-foreground">{d.rotulo}</h2>
              <ul>
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
