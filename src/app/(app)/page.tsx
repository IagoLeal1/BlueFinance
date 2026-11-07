import { connection } from 'next/server';
import Link from 'next/link';
import { Suspense } from 'react';
import { BalanceCard } from '@/components/app/balance-card';
import { SpendingBar } from '@/components/app/spending-bar';
import { TransactionRow } from '@/components/app/transaction-row';
import { mesAtual, nomeDoMes, rotuloDoDia } from '@/domain/datas';
import { summarizeMonth } from '@/domain/summary';
import { ordemDasCategorias } from '@/server/categorias';
import { lancamentosDoMes } from '@/server/lancamentos';

export default function Inicio() {
  return (
    <Suspense fallback={<p className="mt-4 text-muted-foreground">Carregando…</p>}>
      <ResumoDoMesAtual />
    </Suspense>
  );
}

async function ResumoDoMesAtual() {
  await connection(); // o mês depende da hora da requisição, não do build
  const agora = new Date();
  const mes = mesAtual(agora);
  const nome = nomeDoMes(mes);
  const [lancamentos, ordem] = await Promise.all([lancamentosDoMes(mes), ordemDasCategorias()]);
  const resumo = summarizeMonth(lancamentos, mes);

  return (
    <>
      <h1 className="mt-2 text-[28px] leading-[34px] font-extrabold tracking-tight capitalize">{nome}</h1>
      <BalanceCard resumo={resumo} nomeMes={nome} />
      <SpendingBar gastos={resumo.porCategoria} ordemPorNome={ordem} />
      {lancamentos.length > 0 && (
        <section aria-label="Últimos" className="rounded-lg bg-card px-4 pt-3 pb-1 shadow-card">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">Últimos</h2>
            <Link href="/lancamentos" className="text-sm font-bold text-primary">
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
