'use client';

import { useActionState, useState } from 'react';
import { Building2, Check, Landmark, Pencil, PiggyBank, Plus, Scale } from 'lucide-react';
import { criarLancamento } from '@/app/(app)/actions';
import {
  ajustarValorInvestimento,
  atualizarValorInvestimento,
  editarInvestimento,
  type EstadoInvestimento,
} from '@/app/(app)/investimentos/actions';
import { Button } from '@/components/ui/button';
import { diaCurto } from '@/domain/datas';
import { formatBRL, formatRendimento } from '@/domain/money';
import { comecaARender, percentualDoCdi, type LoteRendendo, type RendimentoCdi } from '@/domain/rendimento';
import type { Investimento } from '@/server/investimentos';
import { cn } from '@/lib/utils';
import { AmountInput } from './amount-input';
import { BottomSheet } from './bottom-sheet';
import { CamposInvestimento, type ValoresInvestimento } from './campos-investimento';
import { NotaAporte } from './nota-aporte';
import { Privado } from './privado';

const ICONE: Record<string, typeof Landmark> = { 'Renda fixa': Landmark, FII: Building2 };

type Visao = 'principal' | 'editar' | 'ajustar' | 'aportar';

const doDia = (dia: string) => diaCurto(`${dia}T12:00:00-03:00`);
const pct = (n: number) => `${String(n).replace('.', ',')}%`;

/** "rendendo há 2 dias úteis · o IR cai para 20% em 5 mai". */
function metaDoAporte(l: LoteRendendo, isentoIr: boolean): string {
  const rende = l.diasUteis === 0 ? `rende a partir de ${doDia(comecaARender(l.data))}` : `rendendo há ${l.diasUteis} ${l.diasUteis === 1 ? 'dia útil' : 'dias úteis'}`;
  if (isentoIr) return rende;
  return `${rende} · ${l.irCai ? `o IR cai para ${pct(l.irCai.aliquota)} em ${doDia(l.irCai.em)}` : 'IR de 15%'}`;
}

/** O que sai do rendimento se resgatar hoje. */
function explicaLiquido(r: RendimentoCdi): string {
  if (r.iof > 0 && r.ir > 0) return `Líquido: sai o IOF (${formatBRL(r.iof)}) e o IR (${formatBRL(r.ir)}) do rendimento. Do 30º dia em diante, só o IR.`;
  if (r.iof > 0) return `Líquido: sai o IOF (${formatBRL(r.iof)}) do rendimento. Do 30º dia em diante, nada.`;
  if (r.ir > 0) return `Líquido: sai o IR (${formatBRL(r.ir)}) do rendimento.`;
  return 'Sem IR nem IOF a descontar.';
}

const valoresDe = (i: Investimento): ValoresInvestimento => ({
  nome: i.nome,
  tipo: i.tipo,
  instituicao: i.instituicao,
  comoRende: i.cdi ? 'cdi' : 'manual',
  percentual: i.cdi ? String(i.cdi.percentual).replace('.', ',') : '',
  aplicadoEm: i.cdi?.aplicadoEm ?? '',
  aplicado: i.cdi?.aplicado ?? i.aportado,
  isentoIr: i.cdi?.isentoIr ?? false,
  valorAtual: i.valorAtual,
});

function Erro({ estado }: { estado: EstadoInvestimento }) {
  return estado.erro ? (
    <p role="alert" className="text-sm font-semibold text-negative">
      {estado.erro}
    </p>
  ) : null;
}

/** Posição de investimento; tocar abre o sheet para atualizar quanto vale hoje ou editar como rende. */
export function LinhaInvestimento({ i }: { i: Investimento }) {
  const [aberto, setAberto] = useState(false);
  const [visao, setVisao] = useState<Visao>('principal');
  const [centavos, setCentavos] = useState(i.valorAtual);
  const fechando = (r: EstadoInvestimento) => {
    if (r.ok) setAberto(false);
    return r;
  };
  const [estado, salvar, salvando] = useActionState(
    async (anterior: EstadoInvestimento, form: FormData) => fechando(await atualizarValorInvestimento(anterior, form)),
    {},
  );
  const [estadoEdicao, salvarEdicao, salvandoEdicao] = useActionState(
    async (anterior: EstadoInvestimento, form: FormData) => fechando(await editarInvestimento(anterior, form)),
    {},
  );
  const [aporte, setAporte] = useState(0);
  const [estadoAporte, salvarAporte, salvandoAporte] = useActionState(async (anterior: EstadoInvestimento, form: FormData) => {
    const r = await criarLancamento({}, form);
    return fechando(r.ok ? { ok: true } : { erro: r.erro });
  }, {});
  const [estadoAjuste, salvarAjuste, salvandoAjuste] = useActionState(
    async (anterior: EstadoInvestimento, form: FormData) => fechando(await ajustarValorInvestimento(anterior, form)),
    {},
  );
  const Icone = ICONE[i.tipo] ?? PiggyBank;
  const rendimento = formatRendimento(i.valorAtual, i.aportado);
  const titulo =
    visao === 'editar'
      ? 'Editar investimento'
      : visao === 'ajustar'
        ? 'Ajustar valor'
        : visao === 'aportar'
          ? `Aportar no ${i.nome}`
          : i.cdi
            ? i.nome
            : 'Atualizar investimento';

  return (
    <li className="not-first:border-t not-first:border-border">
      <BottomSheet
        titulo={titulo}
        aberto={aberto}
        onAbertoChange={(v) => {
          setAberto(v);
          if (v) {
            setVisao('principal');
            setCentavos(i.valorAtual);
            setAporte(0);
          }
        }}
        gatilho={
          <button type="button" className="flex min-h-16 w-full items-center gap-3 rounded-md py-3 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
            <span className="grid size-10 shrink-0 place-items-center rounded-[12px] bg-invest-soft text-invest">
              <Icone className="size-5" aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-bold">{i.nome}</span>
              <span className="block text-[13px] leading-[18px] font-semibold text-muted-foreground">{i.cdi ? percentualDoCdi(i.cdi.percentual) : i.tipo}</span>
            </span>
            <span className="text-right">
              <span className="block font-bold tabular-nums">
                <Privado>{formatBRL(i.valorAtual)}</Privado>
              </span>
              <span
                className={cn(
                  'block text-[13px] leading-[18px] font-bold tabular-nums',
                  rendimento.startsWith('▲') ? 'text-positive' : rendimento.startsWith('▼') ? 'text-negative' : 'text-muted-foreground',
                )}
              >
                <Privado mascara="••••">{rendimento}</Privado>
              </span>
            </span>
          </button>
        }
      >
        {visao === 'principal' && i.cdi ? (
          <div className="grid gap-4">
            <p className="-mt-2 text-[13px] leading-[18px] font-semibold text-muted-foreground">
              {i.instituicao} · {percentualDoCdi(i.cdi.percentual)} · {i.cdi.isentoIr ? 'isento de IR' : 'tem IR'}
            </p>
            <div role="group" aria-label="Valor bruto hoje" className="grid justify-items-center gap-1">
              <p aria-hidden className="text-[13px] font-semibold text-muted-foreground">
                Valor bruto hoje
              </p>
              <p className="text-[40px] leading-[44px] font-extrabold tracking-[-0.02em] tabular-nums">{formatBRL(i.cdi.rendimento.bruto)}</p>
            </div>
            <div role="group" aria-label="Se resgatar hoje" className="grid gap-0.5 rounded-md bg-muted p-3">
              <p className="flex justify-between gap-3 font-bold">
                <span aria-hidden>Se resgatar hoje</span>
                <span className="tabular-nums">{formatBRL(i.cdi.rendimento.liquido)}</span>
              </p>
              <p className="text-[13px] leading-[18px] font-semibold text-muted-foreground">{explicaLiquido(i.cdi.rendimento)}</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div role="group" aria-label="Aportado" className="rounded-md bg-muted p-3">
                <p aria-hidden className="text-xs font-semibold text-muted-foreground">Aportado</p>
                <p className="mt-0.5 font-extrabold tabular-nums">{formatBRL(i.cdi.rendimento.aportado)}</p>
              </div>
              <div role="group" aria-label="Rendeu" className="rounded-md bg-muted p-3">
                <p aria-hidden className="text-xs font-semibold text-muted-foreground">Rendeu</p>
                <p className={cn('mt-0.5 font-extrabold tabular-nums', i.cdi.rendimento.rendeu > 0 && 'text-positive', i.cdi.rendimento.rendeu < 0 && 'text-negative')}>
                  {i.cdi.rendimento.rendeu > 0 ? '+ ' : ''}
                  {formatBRL(i.cdi.rendimento.rendeu)}
                </p>
              </div>
            </div>
            <div className="grid gap-1">
              <p id={`aportes-${i.id}`} className="text-xs font-bold text-muted-foreground">
                Aportes
              </p>
              <ul aria-labelledby={`aportes-${i.id}`}>
                {i.cdi.rendimento.lotes.map((l) => (
                  <li key={l.data + l.valor} className="flex items-center gap-3 py-2 not-first:border-t not-first:border-border">
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold">{doDia(l.data)}</span>
                      <span className="block text-[13px] leading-[18px] font-semibold text-muted-foreground">{metaDoAporte(l, i.cdi!.isentoIr)}</span>
                    </span>
                    <span className="font-bold whitespace-nowrap tabular-nums">{formatBRL(l.valor)}</span>
                  </li>
                ))}
              </ul>
            </div>
            <Button type="button" className="w-full" onClick={() => setVisao('aportar')}>
              <Plus aria-hidden />
              Aportar
            </Button>
            <div className="grid grid-cols-2 gap-2">
              <Button type="button" variant="secondary" onClick={() => setVisao('ajustar')}>
                <Scale aria-hidden />
                Ajustar valor
              </Button>
              <Button type="button" variant="secondary" onClick={() => setVisao('editar')}>
                <Pencil aria-hidden />
                Editar
              </Button>
            </div>
          </div>
        ) : visao === 'aportar' && i.cdi ? (
          <form action={salvarAporte} className="grid gap-4">
            <input type="hidden" name="tipo" value="investimento" />
            <input type="hidden" name="investimento_id" value={i.id} />
            <input type="hidden" name="descricao" value={i.nome} />
            <AmountInput nome="valor_centavos" centavos={aporte} onChange={setAporte} />
            <NotaAporte nome={i.nome} instituicao={i.instituicao} percentual={i.cdi.percentual} />
            <Erro estado={estadoAporte} />
            <Button type="submit" disabled={salvandoAporte} className="w-full">
              <Check aria-hidden />
              Salvar aporte
            </Button>
          </form>
        ) : visao === 'ajustar' && i.cdi ? (
          <form action={salvarAjuste} className="grid gap-4">
            <input type="hidden" name="id" value={i.id} />
            <p className="text-[13px] leading-[18px] font-semibold text-muted-foreground">
              Digite o valor que o app do banco mostra. A diferença ({formatBRL(Math.abs(centavos - i.valorAtual))}) vira rendimento e rende junto dali em diante.
            </p>
            <AmountInput nome="valor_banco" rotulo="Valor no app do banco" centavos={centavos} onChange={setCentavos} />
            <Erro estado={estadoAjuste} />
            <Button type="submit" disabled={salvandoAjuste} className="w-full">
              <Check aria-hidden />
              Salvar ajuste
            </Button>
          </form>
        ) : visao === 'editar' ? (
          <form action={salvarEdicao} className="grid gap-4">
            <input type="hidden" name="id" value={i.id} />
            <CamposInvestimento id={`editar-${i.id}`} inicial={valoresDe(i)} investimentoId={i.id} />
            <Erro estado={estadoEdicao} />
            <Button type="submit" disabled={salvandoEdicao} className="w-full">
              <Check aria-hidden />
              Salvar
            </Button>
          </form>
        ) : (
          <form action={salvar} className="grid gap-4">
            <input type="hidden" name="id" value={i.id} />
            <p className="text-[13px] leading-[18px] font-semibold text-muted-foreground">
              {i.nome} · {i.instituicao} · aportado {formatBRL(i.aportado)}
            </p>
            <AmountInput nome="valor_atual" rotulo="Valor atual" centavos={centavos} onChange={setCentavos} />
            <Erro estado={estado} />
            <Button type="submit" disabled={salvando} className="w-full">
              <Check aria-hidden />
              Salvar valor
            </Button>
            <Button type="button" variant="secondary" className="w-full" onClick={() => setVisao('editar')}>
              <Pencil aria-hidden />
              Editar investimento
            </Button>
          </form>
        )}
      </BottomSheet>
    </li>
  );
}
