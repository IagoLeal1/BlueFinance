'use client';

import { useActionState, useState } from 'react';
import { Check, Info } from 'lucide-react';
import { acertarDepositoVr } from '@/app/(app)/lancamentos/actions';
import { Button } from '@/components/ui/button';
import { diaDe, nomeDoMes } from '@/domain/datas';
import { formatBRL } from '@/domain/money';
import type { LancamentoListado } from '@/server/lancamentos';
import { AmountInput, Teclado } from './amount-input';
import { BottomSheet } from './bottom-sheet';
import { metaDe } from './meta';
import { TransactionRow } from './transaction-row';

/**
 * Depósito do VR no extrato do VR (design kit: TelaDepositoVr): tocar abre quanto caiu naquele mês para acertar.
 * Muda só aquele depósito; o valor de Ajustes continua sendo o previsto dos próximos meses.
 */
export function LinhaDepositoVr({ l, previsto }: { l: LancamentoListado; previsto: number | null }) {
  const [aberto, setAberto] = useState(false);
  const [centavos, setCentavos] = useState(l.valor);
  const [estado, salvar, salvando] = useActionState(async (anterior: { ok?: boolean; erro?: string }, form: FormData) => {
    const r = await acertarDepositoVr(anterior, form);
    if (r.ok) setAberto(false);
    return r;
  }, {});
  const dia = diaDe(l.data);
  const mes = nomeDoMes(l.mes ?? dia.slice(0, 7));

  return (
    <li className="not-first:border-t not-first:border-border">
      <BottomSheet
        titulo="Depósito do VR"
        aberto={aberto}
        onAbertoChange={(v) => {
          setAberto(v);
          if (v) setCentavos(l.valor);
        }}
        gatilho={
          <button type="button" className="w-full rounded-md text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
            <TransactionRow l={l} meta={metaDe(l)} como="div" />
          </button>
        }
      >
        <form action={salvar} className="grid gap-4">
          <input type="hidden" name="id" value={l.id} />
          <p className="text-center text-[13px] leading-[18px] text-muted-foreground">
            {mes.charAt(0).toUpperCase() + mes.slice(1)} · caiu dia {Number(dia.slice(8))}
          </p>
          <div className="grid gap-0">
            <p aria-hidden className="text-center text-[13px] leading-[18px] font-bold text-muted-foreground">
              Quanto caiu
            </p>
            <AmountInput teclado nome="valor_centavos" rotulo="Quanto caiu" centavos={centavos} onChange={setCentavos} />
          </div>
          <p className="flex gap-2 rounded-md bg-muted px-3 py-2.5 text-[13px] leading-[18px] text-muted-foreground">
            <Info className="mt-px size-4 shrink-0" aria-hidden />
            <span>
              {previsto !== null && (
                <>
                  Previsto: <b className="text-foreground">{formatBRL(previsto)}</b>.{' '}
                </>
              )}
              Muda só o depósito de {mes}: o saldo do VR se ajusta sozinho. Os próximos meses continuam com o valor de Ajustes.
            </span>
          </p>
          {estado.erro && (
            <p role="alert" className="text-sm font-semibold text-negative">
              {estado.erro}
            </p>
          )}
          <Teclado centavos={centavos} onChange={setCentavos} />
          <Button type="submit" disabled={salvando} className="w-full">
            <Check aria-hidden />
            Salvar depósito
          </Button>
        </form>
      </BottomSheet>
    </li>
  );
}
