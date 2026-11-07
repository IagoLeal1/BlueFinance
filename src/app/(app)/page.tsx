import { connection } from 'next/server';
import { Suspense } from 'react';
import { BalanceCard } from '@/components/app/balance-card';
import { SpendingBar } from '@/components/app/spending-bar';
import { mesAtual, nomeDoMes } from '@/domain/datas';
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
  const mes = mesAtual();
  const nome = nomeDoMes(mes);
  const [lancamentos, ordem] = await Promise.all([lancamentosDoMes(mes), ordemDasCategorias()]);
  const resumo = summarizeMonth(lancamentos, mes);

  return (
    <>
      <h1 className="mt-2 text-[28px] leading-[34px] font-extrabold tracking-tight capitalize">{nome}</h1>
      <BalanceCard resumo={resumo} nomeMes={nome} />
      <SpendingBar gastos={resumo.porCategoria} ordemPorNome={ordem} />
      {lancamentos.length === 0 && (
        <section className="rounded-lg bg-card p-5 text-center shadow-card">
          <p className="font-bold">Nenhum lançamento ainda.</p>
          <p className="mt-1 text-[13px] leading-[18px] font-semibold text-muted-foreground">
            Toque em + ou dê dois toques nas costas do iPhone.
          </p>
        </section>
      )}
    </>
  );
}
