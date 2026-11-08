import type { Metadata } from 'next';
import { connection } from 'next/server';
import { Suspense } from 'react';
import { EsqueletoLista } from '@/components/app/esqueleto';
import { ListaLancamentos, type Fatura } from '@/components/app/lista-lancamentos';
import { MesPicker } from '@/components/app/mes-picker';
import { mesAtual, mesDaUrl, nomeDoMes, opcoesDeMes, rotuloDoDia, somarMeses, tituloDoMes } from '@/domain/datas';
import { diaDoFechamento, faturasDoCartao } from '@/domain/parcelas';
import { listarCartoes } from '@/server/cartoes';
import { categoriasDoUsuario } from '@/server/categorias';
import { completarAssinaturas, lancamentosDoMes, ultimoMesComParcelas, type LancamentoListado } from '@/server/lancamentos';

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
  await completarAssinaturas(agora);
  const [lancamentos, categorias, ultimaParcela, cartoes] = await Promise.all([
    lancamentosDoMes(mes),
    categoriasDoUsuario(),
    ultimoMesComParcelas(mesAtual(agora)),
    listarCartoes(),
  ]);

  // Crédito vai para a fatura do cartão; débito, Pix, receitas e aportes ficam no dia.
  const faturas = new Map<string, Fatura>();
  const dias = new Map<string, LancamentoListado[]>();
  for (const l of lancamentos) {
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
    const rotulo = rotuloDoDia(l.data, agora);
    dias.set(rotulo, [...(dias.get(rotulo) ?? []), l]);
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
        faturas={[...faturas.values()]}
        dias={[...dias].map(([rotulo, doDia]) => ({ rotulo, lancamentos: doDia }))}
        categorias={categorias}
        cartoes={cartoes}
      />
    </>
  );
}
