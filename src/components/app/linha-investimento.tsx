'use client';

import { useActionState, useState } from 'react';
import { Building2, Check, Landmark, PiggyBank } from 'lucide-react';
import { atualizarValorInvestimento, type EstadoInvestimento } from '@/app/(app)/investimentos/actions';
import { Button } from '@/components/ui/button';
import { formatBRL, formatRendimento } from '@/domain/money';
import type { Investimento } from '@/server/investimentos';
import { cn } from '@/lib/utils';
import { AmountInput } from './amount-input';
import { BottomSheet } from './bottom-sheet';

const ICONE: Record<string, typeof Landmark> = { 'Renda fixa': Landmark, FII: Building2 };

/** Posição de investimento; tocar abre o sheet para atualizar quanto vale hoje. */
export function LinhaInvestimento({ i }: { i: Investimento }) {
  const [aberto, setAberto] = useState(false);
  const [centavos, setCentavos] = useState(i.valorAtual);
  const [estado, salvar, salvando] = useActionState(async (anterior: EstadoInvestimento, form: FormData) => {
    const r = await atualizarValorInvestimento(anterior, form);
    if (r.ok) setAberto(false);
    return r;
  }, {});
  const Icone = ICONE[i.tipo] ?? PiggyBank;
  const rendimento = formatRendimento(i.valorAtual, i.aportado);

  return (
    <li className="not-first:border-t not-first:border-border">
      <BottomSheet
        titulo="Atualizar investimento"
        aberto={aberto}
        onAbertoChange={(v) => {
          setAberto(v);
          if (v) setCentavos(i.valorAtual);
        }}
        gatilho={
          <button type="button" className="flex min-h-16 w-full items-center gap-3 rounded-md py-3 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
            <span className="grid size-10 shrink-0 place-items-center rounded-[12px] bg-invest-soft text-invest">
              <Icone className="size-5" aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-bold">{i.nome}</span>
              <span className="block text-[13px] leading-[18px] font-semibold text-muted-foreground">{i.tipo}</span>
            </span>
            <span className="text-right">
              <span className="block font-bold tabular-nums">{formatBRL(i.valorAtual)}</span>
              <span
                className={cn(
                  'block text-[13px] leading-[18px] font-bold tabular-nums',
                  rendimento.startsWith('▲') ? 'text-positive' : rendimento.startsWith('▼') ? 'text-negative' : 'text-muted-foreground',
                )}
              >
                {rendimento}
              </span>
            </span>
          </button>
        }
      >
        <form action={salvar} className="grid gap-4">
          <input type="hidden" name="id" value={i.id} />
          <p className="text-[13px] leading-[18px] font-semibold text-muted-foreground">
            {i.nome} · {i.instituicao} · aportado {formatBRL(i.aportado)}
          </p>
          <AmountInput nome="valor_atual" rotulo="Valor atual" centavos={centavos} onChange={setCentavos} />
          {estado.erro && (
            <p role="alert" className="text-sm font-semibold text-negative">
              {estado.erro}
            </p>
          )}
          <Button type="submit" disabled={salvando} className="w-full">
            <Check aria-hidden />
            Salvar valor
          </Button>
        </form>
      </BottomSheet>
    </li>
  );
}
