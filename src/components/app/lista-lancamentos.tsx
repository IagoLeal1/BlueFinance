'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CreditCard } from 'lucide-react';
import { diaCurto, nomeDoMes } from '@/domain/datas';
import { formatBRL, formatSigned } from '@/domain/money';
import type { Cartao } from '@/server/cartoes';
import type { LancamentoListado } from '@/server/lancamentos';
import { Segmented } from './segmented';
import { LinhaAssinatura } from './editar-assinatura';
import { LinhaCompra } from './editar-compra';
import { LinhaEditavel, type CategoriaEditavel } from './editar-lancamento';
import { ChipsDeFiltro, ResumoDaCategoria } from './filtro-categoria';
import { LancarTotalFatura } from './total-fatura';
import { useFeedback } from './feedback';
import { metaDe } from './meta';
import { Privado } from './privado';
import { FUNDO_DA_FATURA, TransactionRow } from './transaction-row';

export type Extrato = 'debito' | 'credito' | 'vr';
const EXTRATOS: { valor: Extrato; rotulo: string }[] = [
  { valor: 'debito', rotulo: 'Débito' },
  { valor: 'credito', rotulo: 'Crédito' },
];
const EXTRATOS_COM_VR: { valor: Extrato; rotulo: string }[] = [...EXTRATOS, { valor: 'vr', rotulo: 'VR' }];

/** Saldo do VR agora e o próximo depósito, no topo do extrato do VR. */
export interface ResumoVr {
  saldo: number;
  valorMensal: number;
  /** "2026-12-05". */
  proximo: string;
}

/** O pagamento de uma fatura no extrato da conta: uma linha só, no dia do vencimento. */
export interface PagamentoFatura {
  id: string;
  cartao: string;
  /** Mês da fatura ("2026-11"); tocar abre o Crédito dele. */
  mesFatura: string;
  /** Dia do vencimento ("2026-11-11"). */
  vence: string;
  total: number;
  href: string;
}

export interface DiaDeLancamentos {
  rotulo: string;
  lancamentos: LancamentoListado[];
  faturas: PagamentoFatura[];
}

/** Compras no crédito de um cartão que caem na fatura do mês. */
export interface Fatura {
  id: string;
  nome: string;
  /** "Fecha dia 3 de dezembro" (sem cartão cadastrado: null). */
  fecha: string | null;
  total: number;
  lancamentos: LancamentoListado[];
  /** Fatura fechada sem nada lançado: dá para lançar o total de uma vez. */
  semCompras?: { cartao: { id: string; nome: string }; mes: string; fechou: number };
}

/** Linha "Fatura C6bank" no extrato da conta; abre as compras dela no Crédito. */
function LinhaPagamentoFatura({ f, aPagar }: { f: PagamentoFatura; aPagar: boolean }) {
  return (
    <li className="not-first:border-t not-first:border-border">
      <Link href={f.href} className="flex min-h-16 items-center gap-3 py-3">
        <span className={`grid size-10 shrink-0 place-items-center rounded-[12px] ${FUNDO_DA_FATURA}`}>
          <CreditCard className="size-5" aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-semibold">Fatura {f.cartao}</span>
          <span className="block text-[13px] leading-[18px] font-semibold text-muted-foreground">
            {aPagar ? `Crédito · vence ${diaCurto(`${f.vence}T12:00:00-03:00`)}` : `Crédito · fatura de ${nomeDoMes(f.mesFatura)}`}
          </span>
        </span>
        <span className="font-bold whitespace-nowrap tabular-nums text-negative">{formatSigned(f.total, 'despesa')}</span>
      </Link>
    </li>
  );
}

/**
 * Lançamentos do mês em extratos (design kit: TelaExtratoDebito, TelaExtratoCredito e TelaVr). "Débito" é a
 * conta: receitas, débito, Pix, aportes e cada fatura numa linha só, no vencimento ("A pagar" até lá).
 * "Crédito" são as compras no cartão, juntas no card da fatura de cada cartão. "VR" (para quem usa) é o
 * extrato do vale-refeição: o saldo, os depósitos e os gastos pagos com ele.
 */
export function ListaLancamentos({
  extratoInicial,
  faturas,
  dias,
  aPagar,
  categorias,
  cartoes,
  vr = null,
  diasVr = [],
  mes,
  gastos = [],
  categoriaInicial = null,
}: {
  extratoInicial: Extrato;
  faturas: Fatura[];
  dias: DiaDeLancamentos[];
  aPagar: PagamentoFatura[];
  categorias: CategoriaEditavel[];
  cartoes: Cartao[];
  vr?: ResumoVr | null;
  diasVr?: DiaDeLancamentos[];
  /** Mês da tela ("2026-11"). */
  mes: string;
  /** Gastos que contam no mês (o mesmo critério de "Gastos por categoria"), para o filtro por categoria. */
  gastos?: LancamentoListado[];
  /** Categoria já marcada ao abrir (?categoria=Mercado, vindo do Início). */
  categoriaInicial?: string | null;
}) {
  const comVr = !!vr || diasVr.length > 0;
  // Só as categorias com gasto no mês, na ordem do app (as que não estão mais na lista vão no fim).
  const ordem = categorias.filter((c) => c.tipo === 'despesa');
  const posicao = (nome: string) => {
    const i = ordem.findIndex((c) => c.nome === nome);
    return i === -1 ? ordem.length : i;
  };
  const opcoesFiltro = [...new Set(gastos.map((l) => l.categoria))]
    .sort((a, b) => posicao(a) - posicao(b))
    .map((nome) => ({ nome, icone: gastos.find((l) => l.categoria === nome)!.icone }));
  const [categoria, setCategoria] = useState<string | null>(
    categoriaInicial && opcoesFiltro.some((c) => c.nome === categoriaInicial) ? categoriaInicial : null,
  );
  const [extrato, setExtrato] = useState<Extrato>(extratoInicial === 'vr' && !comVr ? 'debito' : extratoInicial);
  const { pendentes: todosPendentes } = useFeedback();
  const noDebito = extrato === 'debito';
  const noVr = extrato === 'vr';

  // Com uma categoria marcada, cada aba fica só com os gastos dela: somem pagamento de fatura, "A pagar",
  // depósito e acerto do VR, e o total de cada fatura passa a ser o dessas compras.
  const daCategoria = (l: LancamentoListado) => l.tipo === 'despesa' && l.origem !== 'acerto' && l.categoria === categoria;
  const soDaCategoria = (lista: DiaDeLancamentos[]) =>
    categoria
      ? lista.map((d) => ({ ...d, faturas: [], lancamentos: d.lancamentos.filter(daCategoria) })).filter((d) => d.lancamentos.length > 0)
      : lista;
  const diasVisiveis = soDaCategoria(dias);
  const diasVrVisiveis = soDaCategoria(diasVr);
  const faturasVisiveis = categoria
    ? faturas
        .map((f) => {
          const compras = f.lancamentos.filter(daCategoria);
          return { ...f, lancamentos: compras, total: compras.reduce((t, l) => t + l.valor, 0), semCompras: undefined };
        })
        .filter((f) => f.lancamentos.length > 0)
    : faturas;
  const aPagarVisivel = categoria ? [] : aPagar;
  const pendentes = todosPendentes.filter((l) => (l.forma === 'vr') === noVr && (!categoria || daCategoria(l)));
  const itensDaAba = (
    extrato === 'credito' ? faturasVisiveis : (noVr ? diasVrVisiveis : diasVisiveis)
  ).flatMap((x) => x.lancamentos);
  const vazio =
    !categoria &&
    (noDebito
      ? dias.length === 0 && aPagar.length === 0 && pendentes.length === 0
      : noVr
        ? diasVr.length === 0 && pendentes.length === 0
        : faturas.length === 0);

  return (
    <>
      {opcoesFiltro.length > 0 && <ChipsDeFiltro opcoes={opcoesFiltro} valor={categoria} onChange={setCategoria} />}
      <Segmented nome="extrato" rotulo="Extrato" opcoes={comVr ? EXTRATOS_COM_VR : EXTRATOS} valor={extrato} onChange={setExtrato} />
      {categoria && (
        <ResumoDaCategoria
          categoria={categoria}
          aba={noDebito ? 'Débito' : noVr ? 'VR' : 'Crédito'}
          mes={mes}
          itens={itensDaAba}
          gastos={gastos}
        />
      )}
      {!categoria && noVr && vr && (
        <section aria-label="Saldo do VR" className="flex items-center justify-between gap-3 rounded-lg bg-card p-4 shadow-card">
          <div>
            <p className="text-[13px] leading-[18px] font-semibold text-muted-foreground">Saldo do VR</p>
            <p className="text-[22px] leading-7 font-extrabold tabular-nums">
              <Privado>{formatBRL(vr.saldo)}</Privado>
            </p>
          </div>
          <p className="text-right text-[13px] leading-[18px] font-semibold text-muted-foreground">
            Próximo depósito
            <br />
            <span className="tabular-nums">{formatBRL(vr.valorMensal)}</span> · {diaCurto(`${vr.proximo}T12:00:00-03:00`)}
          </p>
        </section>
      )}
      {vazio && (
        <p className="rounded-lg bg-card p-5 text-center font-bold shadow-card">
          {noDebito ? 'Nenhum lançamento neste mês.' : noVr ? 'Nada no VR neste mês.' : 'Nenhuma compra no crédito neste mês.'}
        </p>
      )}
      {(noDebito || noVr) && pendentes.length > 0 && (
        <section aria-label="Salvando" className="rounded-lg bg-card px-4 pb-1 shadow-card">
          <ul>
            {pendentes.map((l) => (
              <TransactionRow key={l.id} l={l} meta={metaDe(l)} pendente />
            ))}
          </ul>
        </section>
      )}
      {noDebito && aPagarVisivel.length > 0 && (
        <section aria-label="A pagar" className="rounded-lg bg-card px-4 pb-1 shadow-card">
          <h2 className="pt-4 pb-1 text-xs font-bold tracking-[0.02em] text-muted-foreground">A pagar</h2>
          <ul>
            {aPagarVisivel.map((f) => (
              <LinhaPagamentoFatura key={f.id} f={f} aPagar />
            ))}
          </ul>
        </section>
      )}
      {extrato === 'credito' && faturasVisiveis.map((f) => (
        <section key={f.id} aria-label={`Fatura ${f.nome}`} className="rounded-lg bg-card px-4 pt-3 pb-1 shadow-card">
          <div className="flex items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-[15px] font-extrabold">
              <CreditCard className="size-[18px] text-muted-foreground" aria-hidden />
              Fatura {f.nome}
            </h2>
            <span className="text-sm font-bold tabular-nums text-muted-foreground">{formatBRL(f.total)}</span>
          </div>
          {f.fecha && <p className="text-xs font-semibold text-muted-foreground">{f.fecha}</p>}
          {f.semCompras && (
            <div className="grid gap-1 py-2">
              <p className="text-sm font-semibold text-muted-foreground">As compras desta fatura são de antes de você usar o app.</p>
              <LancarTotalFatura cartao={f.semCompras.cartao} mes={f.semCompras.mes} fechou={f.semCompras.fechou} categorias={categorias} />
            </div>
          )}
          <ul>
            {f.lancamentos.map((l) =>
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
      {noDebito && diasVisiveis.length > 0 && (
        <div className="rounded-lg bg-card px-4 pb-1 shadow-card">
          {diasVisiveis.map((d) => (
            <section key={d.rotulo} aria-label={d.rotulo}>
              <h2 className="pt-4 pb-1 text-xs font-bold tracking-[0.02em] text-muted-foreground">{d.rotulo}</h2>
              <ul>
                {d.faturas.map((f) => (
                  <LinhaPagamentoFatura key={f.id} f={f} aPagar={false} />
                ))}
                {d.lancamentos.map((l) => (
                  <LinhaEditavel key={l.id} l={l} categorias={categorias} cartoes={cartoes} temVr={comVr} />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
      {noVr && diasVrVisiveis.length > 0 && (
        <div className="rounded-lg bg-card px-4 pb-1 shadow-card">
          {diasVrVisiveis.map((d) => (
            <section key={d.rotulo} aria-label={d.rotulo}>
              <h2 className="pt-4 pb-1 text-xs font-bold tracking-[0.02em] text-muted-foreground">{d.rotulo}</h2>
              <ul>
                {d.lancamentos.map((l) =>
                  // Depósito e acerto do VR não se editam: o saldo se corrige em Ajustes › Vale-refeição.
                  l.origem === 'vr' || l.origem === 'acerto' ? (
                    <TransactionRow key={l.id} l={l} meta={metaDe(l)} />
                  ) : (
                    <LinhaEditavel key={l.id} l={l} categorias={categorias} cartoes={cartoes} temVr />
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
