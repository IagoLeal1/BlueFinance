import { connection } from 'next/server';
import Link from 'next/link';
import { Suspense } from 'react';
import { EsqueletoInicio } from '@/components/app/esqueleto';
import { BalanceCard } from '@/components/app/balance-card';
import { CartaoCredito } from '@/components/app/cartao-credito';
import { SpendingBar } from '@/components/app/spending-bar';
import { TransactionRow } from '@/components/app/transaction-row';
import { mesAtual, mesDaUrl, nomeDoMes, opcoesDeMes, rotuloDoDia, tituloDoMes } from '@/domain/datas';
import { MesPicker } from '@/components/app/mes-picker';
import { summarizeMonth } from '@/domain/summary';
import { listarCartoes } from '@/server/cartoes';
import { ordemDasCategorias } from '@/server/categorias';
import { lancamentosDoMes, parcelasAVir, ultimoMesComParcelas } from '@/server/lancamentos';

export default function Inicio({ searchParams }: PageProps<'/'>) {
  return (
    <Suspense fallback={<EsqueletoInicio />}>
      <ResumoDoMes searchParams={searchParams} />
    </Suspense>
  );
}

async function ResumoDoMes({ searchParams }: { searchParams: PageProps<'/'>['searchParams'] }) {
  await connection(); // o mês depende da hora da requisição, não do build
  const agora = new Date();
  const mes = mesDaUrl((await searchParams).mes, agora);
  const nome = nomeDoMes(mes);
  const [lancamentos, ordem, ultimaParcela, cartoes, aVir] = await Promise.all([
    lancamentosDoMes(mes),
    ordemDasCategorias(),
    ultimoMesComParcelas(mesAtual(agora)),
    listarCartoes(),
    parcelasAVir(mes),
  ]);
  const resumo = summarizeMonth(lancamentos, mes);
  const listaDoMes = mes === mesAtual(agora) ? '/lancamentos' : `/lancamentos?mes=${mes}`;
  const fatura = lancamentos.filter((l) => l.forma === 'credito').reduce((t, l) => t + l.valor, 0);

  return (
    <>
      <BalanceCard
        resumo={resumo}
        nomeMes={nome}
        topo={
          <div className="flex items-center justify-between">
            <h1 className="text-[28px] leading-[34px] font-extrabold tracking-tight">{tituloDoMes(mes, agora)}</h1>
            <MesPicker base="/" atual={mes} meses={opcoesDeMes(agora, ultimaParcela)} sobreODegrade />
          </div>
        }
      />
      {cartoes.length > 0 && <CartaoCredito mes={mes} fatura={fatura} aVir={aVir} cartoes={cartoes} href={listaDoMes} />}
      <SpendingBar gastos={resumo.porCategoria} ordemPorNome={ordem} />
      {lancamentos.length > 0 && (
        <section aria-label="Últimos" className="rounded-lg bg-card px-4 pt-3 pb-1 shadow-card">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">Últimos</h2>
            <Link href={listaDoMes} className="text-sm font-bold text-primary">
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
