import type { Metadata } from 'next';
import { connection } from 'next/server';
import { Suspense } from 'react';
import { ArrowDownRight, ArrowUpRight, Landmark } from 'lucide-react';
import { BotaoOlho } from '@/components/app/botao-olho';
import { CabecaTela } from '@/components/app/cabeca-tela';
import { TopoFlutuante } from '@/components/app/topo-flutuante';
import { EsqueletoCarteira } from '@/components/app/esqueleto';
import { GraficoInvestido } from '@/components/app/grafico-investido';
import { LinhaInvestimento } from '@/components/app/linha-investimento';
import { NovoInvestimento } from '@/components/app/novo-investimento';
import { Privado } from '@/components/app/privado';
import { diaCurto, nomeDoMes } from '@/domain/datas';
import { formatBRL, formatReais } from '@/domain/money';
import { cdiAoAno, taxaAoDia } from '@/domain/rendimento';
import { investimentosPorInstituicao } from '@/server/investimentos';

const doDia = (dia: string) => diaCurto(`${dia}T12:00:00-03:00`);

export const metadata: Metadata = { title: 'Investimentos · BlueFinance' };

export default function Investimentos() {
  return (
    <>
      <TopoFlutuante>
        <BotaoOlho />
      </TopoFlutuante>
      <CabecaTela titulo="Investimentos" />
      <Suspense fallback={<EsqueletoCarteira />}>
        <Carteira />
      </Suspense>
    </>
  );
}

async function Carteira() {
  await connection();
  const { total, aportado, grupos, ultimoDia, cdiDoDia, evolucao } = await investimentosPorInstituicao();
  const rendeu = total - aportado;
  return (
    <>
      <section aria-label="Patrimônio investido" className="cartao p-5">
        <p className="text-sm leading-[19px] text-muted-foreground">Patrimônio investido, valor bruto</p>
        <p className="mt-0.5 font-valor text-[38px] leading-[44px] font-bold tracking-[-0.02em] tabular-nums">
          <Privado>{formatBRL(total)}</Privado>
        </p>
        {evolucao && evolucao.rendeuNoMes !== 0 && (
          <p
            className={`mt-1.5 inline-flex items-center gap-[5px] rounded-full py-[3px] pr-2.5 pl-[7px] text-[13px] leading-[18px] font-semibold ${evolucao.rendeuNoMes > 0 ? 'bg-positive-soft text-positive' : 'bg-negative-soft text-negative'}`}
          >
            {evolucao.rendeuNoMes > 0 ? <ArrowUpRight className="size-3.5" aria-hidden /> : <ArrowDownRight className="size-3.5" aria-hidden />}
            <Privado>{`${evolucao.rendeuNoMes > 0 ? '+' : '−'}${formatBRL(Math.abs(evolucao.rendeuNoMes))}`}</Privado> de rendimento em {nomeDoMes(evolucao.pontos.at(-1)!.mes)}
          </p>
        )}
        {ultimoDia && ultimoDia.ganho !== 0 && (
          <p className={`mt-1.5 text-[13px] leading-[18px] font-semibold font-valor tabular-nums ${ultimoDia.ganho > 0 ? 'text-positive' : 'text-negative'}`}>
            {ultimoDia.ganho > 0 ? '▲ + ' : '▼ '}
            <Privado>{formatBRL(Math.abs(ultimoDia.ganho))}</Privado> no último dia útil ({doDia(ultimoDia.dia)})
          </p>
        )}
        {evolucao && <GraficoInvestido pontos={evolucao.pontos} />}
        <div className="mt-4 grid grid-cols-2 gap-2">
          <div role="group" aria-label="Aportado" className="rounded-md bg-foreground/7 p-3">
            <p aria-hidden className="text-xs font-semibold text-muted-foreground">Aportado</p>
            <p className="mt-0.5 font-bold font-valor tabular-nums">
              <Privado mascara="••••">{formatReais(aportado)}</Privado>
            </p>
          </div>
          <div role="group" aria-label="Rendeu" className="rounded-md bg-foreground/7 p-3">
            <p aria-hidden className="text-xs font-semibold text-muted-foreground">Rendeu</p>
            <p className={`mt-0.5 font-bold font-valor tabular-nums ${rendeu > 0 ? 'text-positive' : rendeu < 0 ? 'text-negative' : ''}`}>
              <Privado mascara="••••">
                {rendeu > 0 ? '+ ' : ''}
                {formatReais(rendeu)}
              </Privado>
            </p>
          </div>
        </div>
      </section>
      <NovoInvestimento />
      {grupos.length === 0 && (
        <p className="cartao p-5 text-center text-sm text-muted-foreground">
          Cadastre onde seu dinheiro está investido para acompanhar aqui.
        </p>
      )}
      {cdiDoDia && (
        <p className="flex gap-2 rounded-md bg-foreground/7 px-3 py-2.5 text-[13px] leading-[18px] text-muted-foreground">
          <Landmark className="mt-px size-4 shrink-0" aria-hidden />
          <span>
            CDI de {doDia(cdiDoDia.dia)}: {taxaAoDia(cdiDoDia.taxa)} ao dia ({cdiAoAno(cdiDoDia.taxa).toFixed(2).replace('.', ',')}% ao ano), do Banco
            Central. Sábado, domingo e feriado não rendem.
          </span>
        </p>
      )}
      {grupos.map((g) => (
        <section key={g.instituicao} aria-label={g.instituicao} className="cartao px-4 pt-2 pb-1">
          <div className="flex items-center justify-between">
            <h2 className="text-[17px] leading-[22px] font-semibold">{g.instituicao}</h2>
            <span className="text-[13px] font-semibold text-muted-foreground font-valor tabular-nums">
              <Privado>{formatBRL(g.total)}</Privado>
            </span>
          </div>
          <ul>
            {g.investimentos.map((i) => (
              <LinhaInvestimento key={i.id} i={i} />
            ))}
          </ul>
        </section>
      ))}
    </>
  );
}
