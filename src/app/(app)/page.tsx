import { connection } from 'next/server';
import Link from 'next/link';
import { Suspense } from 'react';
import { BalanceCard } from '@/components/app/balance-card';
import { SpendingBar } from '@/components/app/spending-bar';
import { TransactionRow } from '@/components/app/transaction-row';
import { mesAtual, mesDaUrl, nomeDoMes, opcoesDeMes, rotuloDoDia, tituloDoMes } from '@/domain/datas';
import { MesPicker } from '@/components/app/mes-picker';
import { summarizeMonth } from '@/domain/summary';
import { ordemDasCategorias } from '@/server/categorias';
import { lancamentosDoMes } from '@/server/lancamentos';

export default function Inicio({ searchParams }: PageProps<'/'>) {
  return (
    <Suspense fallback={<p className="mt-4 text-muted-foreground">Carregando…</p>}>
      <ResumoDoMes searchParams={searchParams} />
    </Suspense>
  );
}

async function ResumoDoMes({ searchParams }: { searchParams: PageProps<'/'>['searchParams'] }) {
  await connection(); // o mês depende da hora da requisição, não do build
  const agora = new Date();
  const mes = mesDaUrl((await searchParams).mes, agora);
  const nome = nomeDoMes(mes);
  const [lancamentos, ordem] = await Promise.all([lancamentosDoMes(mes), ordemDasCategorias()]);
  const resumo = summarizeMonth(lancamentos, mes);

  return (
    <>
      <div className="mt-2 flex items-center justify-between">
        <h1 className="text-[28px] leading-[34px] font-extrabold tracking-tight">{tituloDoMes(mes, agora)}</h1>
        <MesPicker base="/" atual={mes} meses={opcoesDeMes(agora)} />
      </div>
      <BalanceCard resumo={resumo} nomeMes={nome} />
      <SpendingBar gastos={resumo.porCategoria} ordemPorNome={ordem} />
      {lancamentos.length > 0 && (
        <section aria-label="Últimos" className="rounded-lg bg-card px-4 pt-3 pb-1 shadow-card">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">Últimos</h2>
            <Link href={mes === mesAtual(agora) ? '/lancamentos' : `/lancamentos?mes=${mes}`} className="text-sm font-bold text-primary">
              Ver todos
            </Link>
          </div>
          <ul>
            {lancamentos.slice(0, 3).map((l) => (
              <TransactionRow key={l.id} l={l} meta={`${rotuloDoDia(l.data, agora).split(' · ')[0]} · ${l.categoria}`} />
            ))}
          </ul>
        </section>
      )}
      {lancamentos.length === 0 && (
        <section className="rounded-lg bg-card p-5 text-center shadow-card">
          <p className="font-bold">Nenhum lançamento ainda.</p>
          <p className="mt-1 text-[13px] leading-[18px] font-semibold text-muted-foreground">
            Toque em + ou aperte o Botão de Ação do iPhone para lançar sem abrir o app.
          </p>
          <Link href="/ajustes" className="mt-2 inline-block text-sm font-bold text-primary">
            Como configurar o Botão de Ação
          </Link>
        </section>
      )}
    </>
  );
}
