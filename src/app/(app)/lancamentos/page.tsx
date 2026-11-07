import type { Metadata } from 'next';
import { connection } from 'next/server';
import { Suspense } from 'react';
import { EsqueletoLista } from '@/components/app/esqueleto';
import { ListaLancamentos } from '@/components/app/lista-lancamentos';
import { MesPicker } from '@/components/app/mes-picker';
import { mesAtual, mesDaUrl, opcoesDeMes, rotuloDoDia, tituloDoMes } from '@/domain/datas';
import { categoriasDoUsuario } from '@/server/categorias';
import { lancamentosDoMes, type LancamentoListado } from '@/server/lancamentos';

export const metadata: Metadata = { title: 'Lançamentos · BlueFinance' };

export default function Lancamentos({ searchParams }: PageProps<'/lancamentos'>) {
  return (
    <Suspense fallback={<EsqueletoLista titulo="Lançamentos" />}>
      <ListaDoMes searchParams={searchParams} />
    </Suspense>
  );
}

async function ListaDoMes({ searchParams }: { searchParams: PageProps<'/lancamentos'>['searchParams'] }) {
  await connection();
  const agora = new Date();
  const mes = mesDaUrl((await searchParams).mes, agora);
  const [lancamentos, categorias] = await Promise.all([lancamentosDoMes(mes), categoriasDoUsuario()]);

  const dias = new Map<string, LancamentoListado[]>();
  for (const l of lancamentos) {
    const rotulo = rotuloDoDia(l.data, agora);
    dias.set(rotulo, [...(dias.get(rotulo) ?? []), l]);
  }
  const titulo = mes === mesAtual(agora) ? 'Lançamentos' : `Lançamentos · ${tituloDoMes(mes, agora)}`;
  return (
    <>
      <div className="mt-2 flex items-center justify-between">
        <h1 className="text-[28px] leading-[34px] font-extrabold tracking-tight">{titulo}</h1>
        <MesPicker base="/lancamentos" atual={mes} meses={opcoesDeMes(agora)} />
      </div>
      <ListaLancamentos dias={[...dias].map(([rotulo, doDia]) => ({ rotulo, lancamentos: doDia }))} categorias={categorias} />
    </>
  );
}
