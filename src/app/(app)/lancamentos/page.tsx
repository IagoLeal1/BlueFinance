import type { Metadata } from 'next';
import { connection } from 'next/server';
import { Suspense } from 'react';
import { EsqueletoLista } from '@/components/app/esqueleto';
import { ListaLancamentos, type DiaDeLancamentos, type Fatura, type PagamentoFatura } from '@/components/app/lista-lancamentos';
import { MesPicker } from '@/components/app/mes-picker';
import { diaDe, mesAtual, mesDaUrl, nomeDoMes, opcoesDeMes, rotuloDoDia, somarMeses, tituloDoMes } from '@/domain/datas';
import { diaDoFechamento, faturasDoCartao } from '@/domain/parcelas';
import { listarCartoes } from '@/server/cartoes';
import { categoriasDoUsuario } from '@/server/categorias';
import { completarAssinaturas, lancamentosDoCaixa, ultimoMesComParcelas } from '@/server/lancamentos';

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
  const params = await searchParams;
  const mes = mesDaUrl(params.mes, agora);
  const extrato = params.ver === 'credito' ? 'credito' : 'debito';
  await completarAssinaturas(agora);
  const [caixa, categorias, ultimaParcela, cartoes] = await Promise.all([
    lancamentosDoCaixa(mes),
    categoriasDoUsuario(),
    ultimoMesComParcelas(mesAtual(agora)),
    listarCartoes(),
  ]);

  // Crédito: as compras da fatura do mês, juntas por cartão. Débito: a conta, dia a dia — e cada fatura
  // que vence no mês numa linha só, no vencimento ("A pagar" até lá).
  const hoje = diaDe(agora);
  const faturas = new Map<string, Fatura>();
  const pagamentos = new Map<string, PagamentoFatura>();
  const itens: { dia: string; rotulo: string; l?: (typeof caixa)[number]; f?: PagamentoFatura }[] = [];
  for (const l of caixa) {
    if (l.forma === 'credito' && l.cartao && l.pagoEm && l.pagoEm.slice(0, 7) === mes) {
      const id = `${l.cartao.id}@${l.mes}`;
      const p = pagamentos.get(id) ?? {
        id,
        cartao: l.cartao.nome,
        mesFatura: l.mes!,
        vence: l.pagoEm,
        total: 0,
        href: l.mes === mesAtual(agora) ? '/lancamentos?ver=credito' : `/lancamentos?mes=${l.mes}&ver=credito`,
      };
      pagamentos.set(id, { ...p, total: p.total + l.valor });
    }
    if (l.mes !== mes) continue;
    if (l.forma === 'credito') {
      const id = l.cartao?.id ?? 'sem-cartao';
      const f = faturas.get(id) ?? {
        id,
        nome: l.cartao?.nome ?? 'cartão excluído',
        fecha: l.cartao ? `Fecha dia ${diaDoFechamento(mes, l.cartao.diaFechamento)} de ${nomeDoMes(mes)}` : null,
        total: 0,
        lancamentos: [],
      };
      faturas.set(id, { ...f, total: f.total + l.valor, lancamentos: [...f.lancamentos, l] });
      continue;
    }
    itens.push({ dia: diaDe(l.data), rotulo: rotuloDoDia(l.data, agora), l });
  }
  const aPagar = [...pagamentos.values()].filter((f) => f.vence > hoje).sort((a, b) => a.vence.localeCompare(b.vence));
  for (const f of pagamentos.values()) {
    if (f.vence <= hoje) itens.push({ dia: f.vence, rotulo: rotuloDoDia(`${f.vence}T12:00:00-03:00`, agora), f });
  }
  const dias: DiaDeLancamentos[] = [];
  for (const item of itens.sort((a, b) => b.dia.localeCompare(a.dia))) {
    let d = dias.at(-1);
    if (!d || d.rotulo !== item.rotulo) dias.push((d = { rotulo: item.rotulo, lancamentos: [], faturas: [] }));
    if (item.l) d.lancamentos.push(item.l);
    if (item.f) d.faturas.push(item.f);
  }
  // A última fatura que fechou, se nada dela foi lançado, aparece vazia com "Lançar o total da fatura".
  for (const c of cartoes) {
    const fechada = somarMeses(faturasDoCartao(agora.toISOString(), c.diaFechamento, c.diaVencimento).aberta, -1);
    if (fechada !== mes || faturas.has(c.id)) continue;
    const fechou = diaDoFechamento(mes, c.diaFechamento);
    faturas.set(c.id, {
      id: c.id,
      nome: c.nome,
      fecha: `Fechou dia ${fechou} · vence dia ${c.diaVencimento}`,
      total: 0,
      lancamentos: [],
      semCompras: { cartao: { id: c.id, nome: c.nome }, mes, fechou },
    });
  }
  const titulo = mes === mesAtual(agora) ? 'Lançamentos' : `Lançamentos · ${tituloDoMes(mes, agora)}`;
  return (
    <>
      <div className="mt-2 flex items-center justify-between">
        <h1 className="text-[28px] leading-[34px] font-extrabold tracking-tight">{titulo}</h1>
        <MesPicker base="/lancamentos" atual={mes} meses={opcoesDeMes(agora, ultimaParcela)} />
      </div>
      <ListaLancamentos
        key={`${mes}-${extrato}`}
        extratoInicial={extrato}
        faturas={[...faturas.values()]}
        dias={dias}
        aPagar={aPagar}
        categorias={categorias}
        cartoes={cartoes}
      />
    </>
  );
}
