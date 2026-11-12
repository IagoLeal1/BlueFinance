'use client';

import { useActionState, useState } from 'react';
import { Check, ChevronRight, Plus, Repeat, WalletCards } from 'lucide-react';
import { salvarVr, type EstadoCartao } from '@/app/(app)/ajustes/actions';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { formatBRL } from '@/domain/money';
import { AmountInput } from './amount-input';
import { BottomSheet } from './bottom-sheet';
import { Stepper } from './stepper';

export interface VrEditavel {
  valorMensal: number;
  dia: number;
  saldo: number;
}

/** Ajustes › Vale-refeição: quanto cai por mês, o dia e o saldo de hoje (design kit: TelaVr). */
export function ConfigurarVr({ vr }: { vr: VrEditavel | null }) {
  const [aberto, setAberto] = useState(false);
  const [valor, setValor] = useState(vr?.valorMensal ?? 0);
  const [dia, setDia] = useState(vr?.dia ?? 1);
  const [saldo, setSaldo] = useState(vr?.saldo ?? 0);
  const [estado, salvar, salvando] = useActionState(async (anterior: EstadoCartao, form: FormData) => {
    const r = await salvarVr(anterior, form);
    if (r.ok) setAberto(false);
    return r;
  }, {});

  const gatilho = vr ? (
    <button type="button" className="flex min-h-14 w-full items-center gap-3 py-2 text-left">
      <span className="grid size-10 shrink-0 place-items-center rounded-[12px] bg-muted text-muted-foreground">
        <WalletCards className="size-5" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-bold">VR</span>
        <span className="block text-[13px] leading-[18px] font-semibold text-muted-foreground">
          {formatBRL(vr.valorMensal)} todo dia {vr.dia} · saldo {formatBRL(vr.saldo)}
        </span>
      </span>
      <ChevronRight className="size-5 text-muted-foreground" aria-hidden />
    </button>
  ) : (
    <Button variant="ghost" className="-ml-5">
      <Plus aria-hidden />
      Adicionar VR
    </Button>
  );
  const sheet = (
    <BottomSheet
      titulo="VR"
      aberto={aberto}
      onAbertoChange={(v) => {
        setAberto(v);
        if (v) {
          setValor(vr?.valorMensal ?? 0);
          setDia(vr?.dia ?? 1);
          setSaldo(vr?.saldo ?? 0);
        }
      }}
      gatilho={gatilho}
    >
      <form action={salvar} className="grid gap-4">
        <div className="grid gap-0">
          <p aria-hidden className="text-center text-[13px] leading-[18px] font-bold text-muted-foreground">
            Quanto cai por mês
          </p>
          <AmountInput nome="valor_mensal" rotulo="Quanto cai por mês" centavos={valor} onChange={setValor} />
        </div>
        <div className="grid gap-2">
          <Label>Dia que cai</Label>
          <Stepper valor={dia} min={1} max={31} onChange={setDia} rotulo={(d) => `dia ${d}`} grupo="Dia que cai" />
          <input type="hidden" name="dia" value={dia} />
          <p className="text-[13px] leading-[18px] font-semibold text-muted-foreground">Em mês mais curto, cai no último dia.</p>
        </div>
        <div className="grid gap-0">
          <p aria-hidden className="text-center text-[13px] leading-[18px] font-bold text-muted-foreground">
            Saldo de hoje
          </p>
          <AmountInput nome="saldo" rotulo="Saldo de hoje" centavos={saldo} onChange={setSaldo} />
        </div>
        <p className="flex gap-2 rounded-md bg-muted px-3 py-2.5 text-[13px] leading-[18px] font-semibold text-muted-foreground">
          <Repeat className="mt-px size-4 shrink-0" aria-hidden />
          <span>
            Todo dia {dia} entram <b className="text-foreground">{formatBRL(valor)}</b> no VR. O que sobra passa para o mês seguinte. Se o
            saldo não bater com o app do VR, corrija aqui.
          </span>
        </p>
        {estado.erro && (
          <p role="alert" className="text-sm font-semibold text-negative">
            {estado.erro}
          </p>
        )}
        <Button type="submit" disabled={salvando} className="w-full">
          <Check aria-hidden />
          Salvar VR
        </Button>
      </form>
    </BottomSheet>
  );

  return (
    <section aria-label="Vale-refeição" className="rounded-lg bg-card px-4 pt-3 pb-1 shadow-card">
      <h2 className="text-lg font-bold">Vale-refeição</h2>
      {vr ? (
        <ul>
          <li>{sheet}</li>
        </ul>
      ) : (
        <>
          <p className="py-2 text-[13px] leading-[18px] font-semibold text-muted-foreground">
            Um segundo saldo, separado da conta: o depósito cai sozinho todo mês, e o gasto pago com VR sai só dele.
          </p>
          {sheet}
        </>
      )}
    </section>
  );
}
