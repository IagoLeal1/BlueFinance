import { connection } from 'next/server';
import Link from 'next/link';
import { Suspense } from 'react';
import { EsqueletoInicio } from '@/components/app/esqueleto';
import { BotaoOlho } from '@/components/app/botao-olho';
import { BalanceCard } from '@/components/app/balance-card';
import { CartaoCredito } from '@/components/app/cartao-credito';
import { SpendingBar } from '@/components/app/spending-bar';
import { TransactionRow } from '@/components/app/transaction-row';
import { diaDe, mesAtual, mesDaUrl, nomeDoMes, opcoesDeMes, rotuloDoDia, tituloDoMes } from '@/domain/datas';
import { MesPicker } from '@/components/app/mes-picker';
import { summarizeMonth } from '@/domain/summary';
import { listarCartoes, resumoDosCartoes } from '@/server/cartoes';
import { ordemDasCategorias } from '@/server/categorias';
import { completarAssinaturas, lancamentosDoCaixa, ultimoMesComParcelas } from '@/server/lancamentos';

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
  await completarAssinaturas(agora);
  const [caixa, ordem, ultimaParcela, cartoes] = await Promise.all([
    lancamentosDoCaixa(mes),
    ordemDasCategorias(),
    ultimoMesComParcelas(mesAtual(agora)),
    listarCartoes(),
  ]);
  // A fatura sai da conta no vencimento: até lá fica "a pagar", fora do Saiu e do Sobrou.
  const hoje = diaDe(agora);
  const resumo = summarizeMonth(caixa, mes, hoje);
  const lancamentos = caixa.filter((l) => l.mes === mes);
  const aPagar = new Map<string, number>();
  for (const l of caixa) {
    if (l.cartao && l.pagoEm && l.pagoEm.slice(0, 7) === mes && l.pagoEm > hoje) aPagar.set(l.cartao.nome, Number(l.pagoEm.slice(8)));
  }
  const [[cartaoAPagar, diaAPagar] = ['', 0]] = [...aPagar];
  const depois =
    aPagar.size === 0
      ? undefined
      : aPagar.size === 1
        ? { texto: `Depois da fatura do ${cartaoAPagar} (dia ${diaAPagar})`, valor: resumo.sobrou - resumo.aPagar }
        : { texto: `Depois das faturas a pagar (dias ${[...aPagar.values()].sort((a, b) => a - b).join(' e ')})`, valor: resumo.sobrou - resumo.aPagar };
  const listaDoMes = mes === mesAtual(agora) ? '/lancamentos' : `/lancamentos?mes=${mes}`;
  // O card do cartão fala de agora (fatura a pagar e aberta): só no mês atual.
  const noMesAtual = mes === mesAtual(agora);
  const cartao = noMesAtual ? await resumoDosCartoes(cartoes, agora) : null;

  return (
    <>
      <BalanceCard
        resumo={resumo}
        nomeMes={nome}
        depois={depois}
        topo={
          <div className="flex items-center justify-between">
            <h1 className="text-[28px] leading-[34px] font-extrabold tracking-tight">{tituloDoMes(mes, agora)}</h1>
            <div className="flex gap-2">
              <BotaoOlho sobreODegrade />
              <MesPicker base="/" atual={mes} meses={opcoesDeMes(agora, ultimaParcela)} sobreODegrade />
            </div>
          </div>
        }
      />
      {cartao && cartao.cartoes.length > 0 && <CartaoCredito resumos={cartao.cartoes} aVir={cartao.aVir} assinaturas={cartao.assinaturas} mesAtual={mesAtual(agora)} />}
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
