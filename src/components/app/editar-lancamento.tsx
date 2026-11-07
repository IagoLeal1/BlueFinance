'use client';

import { useActionState, useState } from 'react';
import { Check, Trash2 } from 'lucide-react';
import { editarLancamento, excluirLancamento, type EstadoLancamento } from '@/app/(app)/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { LancamentoListado } from '@/server/lancamentos';
import { AmountInput } from './amount-input';
import { BottomSheet } from './bottom-sheet';
import { TransactionRow } from './transaction-row';

/** Linha de lançamento que, ao tocar, abre o sheet para editar ou excluir. */
export function LinhaEditavel({ l }: { l: LancamentoListado }) {
  const [aberto, setAberto] = useState(false);
  const [centavos, setCentavos] = useState(l.valor);
  const [confirmando, setConfirmando] = useState(false);

  const fecharSeOk = (acao: typeof editarLancamento) => async (anterior: EstadoLancamento, form: FormData) => {
    const r = await acao(anterior, form);
    if (r.ok) setAberto(false);
    return r;
  };
  const [estadoEdicao, salvar, salvando] = useActionState(fecharSeOk(editarLancamento), {});
  const [estadoExclusao, excluir, excluindo] = useActionState(fecharSeOk(excluirLancamento), {});
  const erro = estadoEdicao.erro ?? estadoExclusao.erro;

  return (
    <li className="not-first:border-t not-first:border-border">
      <BottomSheet
        titulo="Editar lançamento"
        aberto={aberto}
        onAbertoChange={(v) => {
          setAberto(v);
          if (v) {
            setCentavos(l.valor);
            setConfirmando(false);
          }
        }}
        gatilho={
          <button type="button" className="w-full text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring rounded-md">
            <TransactionRow l={l} meta={l.categoria} como="div" />
          </button>
        }
      >
        <form action={salvar} className="grid gap-4">
          <input type="hidden" name="id" value={l.id} />
          <AmountInput nome="valor_centavos" centavos={centavos} onChange={setCentavos} />
          <div className="grid gap-2">
            <Label htmlFor={`descricao-${l.id}`}>Com o quê</Label>
            <Input id={`descricao-${l.id}`} name="descricao" defaultValue={l.descricao} />
          </div>
          {erro && (
            <p role="alert" className="text-sm font-semibold text-negative">
              {erro}
            </p>
          )}
          <Button type="submit" disabled={salvando} className="w-full">
            <Check aria-hidden />
            Salvar alterações
          </Button>
        </form>

        {!confirmando ? (
          <Button type="button" variant="destructive" className="w-full" onClick={() => setConfirmando(true)}>
            <Trash2 aria-hidden />
            Excluir lançamento
          </Button>
        ) : (
          <form action={excluir} className="grid gap-3 rounded-md bg-negative-soft p-4">
            <input type="hidden" name="id" value={l.id} />
            <p className="text-sm font-bold text-negative">Excluir de vez? Isso não pode ser desfeito.</p>
            <div className="grid grid-cols-2 gap-2">
              <Button type="button" variant="ghost" onClick={() => setConfirmando(false)}>
                Cancelar
              </Button>
              <Button type="submit" variant="destructive" disabled={excluindo}>
                Sim, excluir
              </Button>
            </div>
          </form>
        )}
      </BottomSheet>
    </li>
  );
}
