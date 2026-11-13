'use client';

import { nomeDoMes } from '@/domain/datas';
import { formatBRL } from '@/domain/money';
import { gastosDaCategoria } from '@/domain/summary';
import { cn } from '@/lib/utils';
import type { LancamentoListado } from '@/server/lancamentos';
import { CHIP } from './estilos';
import { IconeCategoria } from './icone-categoria';

/**
 * Fileira de categorias em cima das abas (design kit: TelaFiltroCategoria): "Tudo" e as categorias com gasto no
 * mês, na ordem do app. Marcar uma filtra a aba aberta; a troca é no aparelho, sem ir ao servidor.
 */
export function ChipsDeFiltro({
  opcoes,
  valor,
  onChange,
}: {
  opcoes: { nome: string; icone: string }[];
  valor: string | null;
  onChange: (categoria: string | null) => void;
}) {
  const chip = (nome: string, icone: string | null, marcado: boolean, escolher: () => void) => (
    <button
      key={nome}
      type="button"
      aria-pressed={marcado}
      onClick={escolher}
      className={cn(CHIP, 'inline-flex shrink-0 items-center whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring')}
    >
      {icone && <IconeCategoria nome={icone} className="size-4" />}
      {nome}
    </button>
  );
  return (
    <div role="group" aria-label="Categoria" className="-mx-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {chip('Tudo', null, valor === null, () => onChange(null))}
      {opcoes.map((c) => chip(c.nome, c.icone, valor === c.nome, () => onChange(c.nome)))}
    </div>
  );
}

/**
 * Com uma categoria marcada, o topo da aba aberta (design kit: TelaFiltroCategoria): quanto foi a categoria naquela
 * aba e quanto ela soma no mês somando tudo — o mesmo número de "Gastos por categoria" do Início.
 */
export function ResumoDaCategoria({
  categoria,
  aba,
  mes,
  itens,
  gastos,
}: {
  categoria: string;
  aba: 'Débito' | 'Crédito' | 'VR';
  mes: string;
  /** Os gastos da categoria que a aba está mostrando. */
  itens: LancamentoListado[];
  /** Todos os gastos que contam no mês, para o total "somando tudo". */
  gastos: LancamentoListado[];
}) {
  const titulo = `${categoria} no ${aba} · ${nomeDoMes(mes)}`;
  const total = itens.reduce((t, l) => t + l.valor, 0);
  const noMes = gastosDaCategoria(gastos, mes, categoria);
  const n = itens.length;
  const quantos =
    n === 0
      ? `Nenhum gasto de ${categoria} no ${aba}`
      : aba === 'Crédito'
        ? `${n} ${n === 1 ? 'compra' : 'compras'}`
        : `${n} ${n === 1 ? 'gasto' : 'gastos'}`;
  return (
    <section aria-label={titulo} className="rounded-lg bg-card p-4 shadow-card">
      <p className="text-[13px] leading-[18px] font-semibold text-muted-foreground">{titulo}</p>
      <p className="mt-0.5 text-[30px] leading-9 font-extrabold tracking-[-0.02em] tabular-nums">{formatBRL(total)}</p>
      <p className="mt-0.5 text-[13px] leading-[18px] font-semibold text-muted-foreground">
        {quantos} · {categoria} no mês, somando tudo: {formatBRL(noMes.total)} ({noMes.percentual}%)
      </p>
    </section>
  );
}
