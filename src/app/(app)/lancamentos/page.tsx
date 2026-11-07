import type { Metadata } from 'next';
import { connection } from 'next/server';
import { Suspense } from 'react';
import { TransactionRow } from '@/components/app/transaction-row';
import { mesAtual, rotuloDoDia } from '@/domain/datas';
import { lancamentosDoMes, type LancamentoListado } from '@/server/lancamentos';

export const metadata: Metadata = { title: 'Lançamentos · BlueFinance' };

export default function Lancamentos() {
  return (
    <>
      <h1 className="mt-2 text-[28px] leading-[34px] font-extrabold tracking-tight">Lançamentos</h1>
      <Suspense fallback={<p className="text-muted-foreground">Carregando…</p>}>
        <ListaDoMes />
      </Suspense>
    </>
  );
}

async function ListaDoMes() {
  await connection();
  const agora = new Date();
  const lancamentos = await lancamentosDoMes(mesAtual(agora));
  if (lancamentos.length === 0) {
    return <p className="rounded-lg bg-card p-5 text-center font-bold shadow-card">Nenhum lançamento neste mês.</p>;
  }

  const dias = new Map<string, LancamentoListado[]>();
  for (const l of lancamentos) {
    const rotulo = rotuloDoDia(l.data, agora);
    dias.set(rotulo, [...(dias.get(rotulo) ?? []), l]);
  }

  return (
    <div className="rounded-lg bg-card px-4 pb-1 shadow-card">
      {[...dias].map(([rotulo, doDia]) => (
        <section key={rotulo} aria-label={rotulo}>
          <h2 className="pt-4 pb-1 text-xs font-bold tracking-[0.02em] text-muted-foreground">{rotulo}</h2>
          <ul>
            {doDia.map((l) => (
              <TransactionRow key={l.id} l={l} meta={l.categoria} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
