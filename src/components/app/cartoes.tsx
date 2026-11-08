'use client';

import { useActionState, useState } from 'react';
import { Check, ChevronRight, CreditCard, Plus, Trash2 } from 'lucide-react';
import { excluirCartao, salvarCartao, type EstadoCartao } from '@/app/(app)/ajustes/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Cartao } from '@/server/cartoes';
import { BottomSheet } from './bottom-sheet';
import { Stepper } from './stepper';

/** Sheet de cartão: novo (sem `cartao`) ou edição (com `cartao`, inclui excluir). */
function SheetCartao({ cartao, gatilho }: { cartao?: Cartao; gatilho: React.ReactElement }) {
  const [aberto, setAberto] = useState(false);
  const [dia, setDia] = useState(cartao?.diaFechamento ?? 1);
  const [vence, setVence] = useState(cartao?.diaVencimento ?? 10);
  const [confirmando, setConfirmando] = useState(false);
  const fecharSeOk = (acao: typeof salvarCartao) => async (anterior: EstadoCartao, form: FormData) => {
    const r = await acao(anterior, form);
    if (r.ok) setAberto(false);
    return r;
  };
  const [estado, salvar, salvando] = useActionState(fecharSeOk(salvarCartao), {});
  const [estadoExcluir, excluir, excluindo] = useActionState(fecharSeOk(excluirCartao), {});
  const erro = estado.erro ?? estadoExcluir.erro;
  const idNome = `nome-cartao-${cartao?.id ?? 'novo'}`;

  return (
    <BottomSheet
      titulo={cartao ? 'Editar cartão' : 'Novo cartão'}
      aberto={aberto}
      onAbertoChange={(v) => {
        setAberto(v);
        if (v) {
          setDia(cartao?.diaFechamento ?? 1);
          setVence(cartao?.diaVencimento ?? 10);
          setConfirmando(false);
        }
      }}
      gatilho={gatilho}
    >
      <form action={salvar} className="grid gap-4">
        {cartao && <input type="hidden" name="id" value={cartao.id} />}
        <div className="grid gap-2">
          <Label htmlFor={idNome}>Nome</Label>
          <Input id={idNome} name="nome" defaultValue={cartao?.nome} placeholder="Ex.: Nubank" />
        </div>
        <div className="grid gap-2">
          <Label>Dia que a fatura fecha</Label>
          <Stepper valor={dia} min={1} max={31} onChange={setDia} rotulo={(d) => `dia ${d}`} grupo="Dia que a fatura fecha" />
          <input type="hidden" name="dia_fechamento" value={dia} />
          <p className="text-[13px] leading-[18px] font-semibold text-muted-foreground">
            Está no app do banco. Compras a partir desse dia vão para a fatura seguinte.
          </p>
        </div>
        <div className="grid gap-2">
          <Label>Dia do vencimento</Label>
          <Stepper valor={vence} min={1} max={31} onChange={setVence} rotulo={(d) => `dia ${d}`} grupo="Dia do vencimento" />
          <input type="hidden" name="dia_vencimento" value={vence} />
        </div>
        {erro && (
          <p role="alert" className="text-sm font-semibold text-negative">
            {erro}
          </p>
        )}
        <Button type="submit" disabled={salvando} className="w-full">
          <Check aria-hidden />
          Salvar cartão
        </Button>
      </form>
      {cartao &&
        (!confirmando ? (
          <Button type="button" variant="destructive" className="w-full" onClick={() => setConfirmando(true)}>
            <Trash2 aria-hidden />
            Excluir cartão
          </Button>
        ) : (
          <form action={excluir} className="grid gap-3 rounded-md bg-negative-soft p-4">
            <input type="hidden" name="id" value={cartao.id} />
            <p className="text-sm font-bold text-negative">Excluir o cartão? As compras feitas nele continuam nos lançamentos.</p>
            <div className="grid grid-cols-2 gap-2">
              <Button type="button" variant="ghost" onClick={() => setConfirmando(false)}>
                Cancelar
              </Button>
              <Button type="submit" variant="destructive" disabled={excluindo}>
                Sim, excluir
              </Button>
            </div>
          </form>
        ))}
    </BottomSheet>
  );
}

/** Seção de Ajustes com os cartões de crédito (design kit: TelaCartoes). */
export function Cartoes({ cartoes }: { cartoes: Cartao[] }) {
  return (
    <section aria-label="Cartões de crédito" className="rounded-lg bg-card px-4 pt-3 pb-1 shadow-card">
      <h2 className="text-lg font-bold">Cartões de crédito</h2>
      {cartoes.length === 0 && (
        <p className="py-2 text-[13px] leading-[18px] font-semibold text-muted-foreground">
          Cadastre seu cartão para lançar compras no crédito e parceladas.
        </p>
      )}
      <ul>
        {cartoes.map((c) => (
          <li key={c.id} className="not-first:border-t not-first:border-border">
            <SheetCartao
              cartao={c}
              gatilho={
                <button type="button" className="flex min-h-14 w-full items-center gap-3 py-2 text-left">
                  <span className="grid size-10 shrink-0 place-items-center rounded-[12px] bg-muted text-muted-foreground">
                    <CreditCard className="size-5" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-bold">{c.nome}</span>
                    <span className="block text-[13px] leading-[18px] font-semibold text-muted-foreground">
                      Fecha dia {c.diaFechamento} · vence dia {c.diaVencimento}
                    </span>
                  </span>
                  <ChevronRight className="size-5 text-muted-foreground" aria-hidden />
                </button>
              }
            />
          </li>
        ))}
      </ul>
      <SheetCartao
        gatilho={
          <Button variant="ghost" className="-ml-5">
            <Plus aria-hidden />
            Adicionar cartão
          </Button>
        }
      />
    </section>
  );
}
