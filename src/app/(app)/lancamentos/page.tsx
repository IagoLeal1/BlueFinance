import type { Metadata } from 'next';
import { connection } from 'next/server';
import { Suspense } from 'react';
import { ListaLancamentos } from '@/components/app/lista-lancamentos';
import { mesAtual, rotuloDoDia } from '@/domain/datas';
import { categoriasDoUsuario } from '@/server/categorias';
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
  const [lancamentos, categorias] = await Promise.all([lancamentosDoMes(mesAtual(agora)), categoriasDoUsuario()]);

  const dias = new Map<string, LancamentoListado[]>();
  for (const l of lancamentos) {
    const rotulo = rotuloDoDia(l.data, agora);
    dias.set(rotulo, [...(dias.get(rotulo) ?? []), l]);
  }
  return <ListaLancamentos dias={[...dias].map(([rotulo, doDia]) => ({ rotulo, lancamentos: doDia }))} categorias={categorias} />;
}
