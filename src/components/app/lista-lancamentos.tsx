'use client';

import { useState } from 'react';
import type { TipoLancamento } from '@/domain/money';
import type { LancamentoListado } from '@/server/lancamentos';
import { Segmented } from './segmented';
import { LinhaEditavel } from './editar-lancamento';
import { useFeedback } from './feedback';
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

/** Lista do mês agrupada por dia, com filtro por tipo (design kit: TelaLancamentos). */
export function ListaLancamentos({ dias }: { dias: DiaDeLancamentos[] }) {
  const [filtro, setFiltro] = useState<Filtro>('tudo');
  const { pendentes } = useFeedback();
  const visiveis = dias
    .map((d) => ({ ...d, lancamentos: d.lancamentos.filter((l) => filtro === 'tudo' || l.tipo === filtro) }))
    .filter((d) => d.lancamentos.length > 0);

  return (
    <>
      <Segmented nome="filtro" rotulo="Filtro" opcoes={FILTROS} valor={filtro} onChange={setFiltro} />
      {pendentes.length > 0 && (
        <section aria-label="Salvando" className="rounded-lg bg-card px-4 pb-1 shadow-card">
          <ul>
            {pendentes.map((l) => (
              <TransactionRow key={l.id} l={l} meta={l.categoria} pendente />
            ))}
          </ul>
        </section>
      )}
      {visiveis.length === 0 && pendentes.length === 0 ? (
        <p className="rounded-lg bg-card p-5 text-center font-bold shadow-card">Nenhum lançamento neste mês.</p>
      ) : visiveis.length === 0 ? null : (
        <div className="rounded-lg bg-card px-4 pb-1 shadow-card">
          {visiveis.map((d) => (
            <section key={d.rotulo} aria-label={d.rotulo}>
              <h2 className="pt-4 pb-1 text-xs font-bold tracking-[0.02em] text-muted-foreground">{d.rotulo}</h2>
              <ul>
                {d.lancamentos.map((l) => (
                  <LinhaEditavel key={l.id} l={l} />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </>
  );
}
