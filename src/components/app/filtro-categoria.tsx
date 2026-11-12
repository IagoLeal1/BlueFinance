'use client';

import { diaDe, nomeDoMes, rotuloDoDia } from '@/domain/datas';
import { formatBRL, formatReais } from '@/domain/money';
import { gastosDaCategoria } from '@/domain/summary';
import { cn } from '@/lib/utils';
import type { Cartao } from '@/server/cartoes';
import type { LancamentoListado } from '@/server/lancamentos';
import { LinhaAssinatura } from './editar-assinatura';
import { LinhaCompra } from './editar-compra';
import { LinhaEditavel, type CategoriaEditavel } from './editar-lancamento';
import { CHIP } from './estilos';
import { IconeCategoria } from './icone-categoria';

/**
 * Fileira de categorias em cima do extrato (design kit: TelaFiltroCategoria): "Tudo" e as categorias com gasto
 * no mês, na ordem do app. A troca é no aparelho, sem ir ao servidor.
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
 * Uma categoria no mês: o total de qualquer jeito que foi pago (o mesmo número de "Gastos por categoria" no
 * Início), separado em Débito e Pix, Crédito e VR, e só os gastos dela — débito, Pix e VR por dia, depois as
 * compras que estão na fatura do mês.
 */
export function VistaDaCategoria({
  categoria,
  mes,
  gastos,
  comVr,
  categorias,
  cartoes,
}: {
  categoria: string;
  mes: string;
  gastos: LancamentoListado[];
  comVr: boolean;
  categorias: CategoriaEditavel[];
  cartoes: Cartao[];
}) {
  const resumo = gastosDaCategoria(gastos, mes, categoria);
  const daCategoria = gastos.filter((l) => l.categoria === categoria).sort((a, b) => b.data.localeCompare(a.data));
  const grupos: { rotulo: string; lancamentos: LancamentoListado[] }[] = [];
  const grupo = (rotulo: string) => {
    let g = grupos.find((x) => x.rotulo === rotulo);
    if (!g) grupos.push((g = { rotulo, lancamentos: [] }));
    return g;
  };
  for (const l of daCategoria.filter((x) => x.forma !== 'credito').sort((a, b) => diaDe(b.data).localeCompare(diaDe(a.data)))) {
    grupo(rotuloDoDia(l.data)).lancamentos.push(l);
  }
  for (const l of daCategoria.filter((x) => x.forma === 'credito')) {
    grupo(`Na fatura de ${nomeDoMes(l.mes ?? mes)} · ${l.cartao?.nome ?? 'cartão excluído'}`).lancamentos.push(l);
  }
  const formas = [
    { rotulo: 'Débito e Pix', valor: resumo.porForma.debitoPix },
    { rotulo: 'Crédito', valor: resumo.porForma.credito },
    ...(comVr || resumo.porForma.vr > 0 ? [{ rotulo: 'VR', valor: resumo.porForma.vr }] : []),
  ];

  return (
    <>
      <section aria-label={`${categoria} em ${nomeDoMes(mes)}`} className="rounded-lg bg-card p-4 shadow-card">
        <p className="text-[13px] leading-[18px] font-semibold text-muted-foreground">
          {categoria} em {nomeDoMes(mes)}
        </p>
        <p className="mt-1 text-[34px] leading-[40px] font-extrabold tracking-[-0.02em] tabular-nums">{formatBRL(resumo.total)}</p>
        <p className="mt-1 text-[13px] leading-[18px] font-semibold text-muted-foreground">
          {resumo.quantidade} {resumo.quantidade === 1 ? 'gasto' : 'gastos'} · {resumo.percentual}% do que você gastou no mês
        </p>
        <div className={cn('mt-3 grid gap-2', formas.length === 3 ? 'grid-cols-3' : 'grid-cols-2')}>
          {formas.map((f) => (
            <div key={f.rotulo} role="group" aria-label={f.rotulo} className="rounded-md bg-muted p-3">
              <p aria-hidden className="text-xs font-semibold text-muted-foreground">
                {f.rotulo}
              </p>
              <p className="mt-0.5 text-base font-extrabold tabular-nums">{formatReais(f.valor)}</p>
            </div>
          ))}
        </div>
      </section>
      {grupos.length > 0 && (
        <div className="rounded-lg bg-card px-4 pb-1 shadow-card">
          {grupos.map((g) => (
            <section key={g.rotulo} aria-label={g.rotulo}>
              <h2 className="pt-4 pb-1 text-xs font-bold tracking-[0.02em] text-muted-foreground">{g.rotulo}</h2>
              <ul>
                {g.lancamentos.map((l) =>
                  l.recorrente ? (
                    <LinhaAssinatura key={l.id} l={l} categorias={categorias} />
                  ) : l.compraId ? (
                    <LinhaCompra key={l.id} l={l} categorias={categorias} cartoes={cartoes} temVr={comVr} />
                  ) : (
                    <LinhaEditavel key={l.id} l={l} categorias={categorias} cartoes={cartoes} temVr={comVr} />
                  ),
                )}
              </ul>
            </section>
          ))}
        </div>
      )}
    </>
  );
}
