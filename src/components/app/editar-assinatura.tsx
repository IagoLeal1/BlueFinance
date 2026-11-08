'use client';

import { useActionState, useState } from 'react';
import { Check, Repeat, Trash2 } from 'lucide-react';
import { editarAssinatura, excluirCompra, pararAssinatura, type EstadoLancamento } from '@/app/(app)/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { LancamentoListado } from '@/server/lancamentos';
import { AmountInput } from './amount-input';
import { BottomSheet } from './bottom-sheet';
import { ChipsDeCategoria, type CategoriaEditavel } from './editar-lancamento';
import { metaDe } from './meta';
import { TransactionRow } from './transaction-row';

/**
 * Um mês de uma assinatura ("Todo mês", design kit: TelaRecorrente). Tocar abre a assinatura:
 * o valor novo vale da fatura aberta em diante, "Parar de repetir" tira os próximos meses e "Excluir" apaga todos.
 */
export function LinhaAssinatura({ l, categorias }: { l: LancamentoListado; categorias: CategoriaEditavel[] }) {
  const opcoes = categorias.filter((c) => c.tipo === 'despesa');
  const atual = opcoes.find((c) => c.nome === l.categoria)?.id;
  const [aberto, setAberto] = useState(false);
  const [centavos, setCentavos] = useState(l.valor);
  const [categoria, setCategoria] = useState<string[]>(atual ? [atual] : []);
  const [confirmando, setConfirmando] = useState<'parar' | 'excluir' | null>(null);

  const fecharSeOk = (acao: typeof editarAssinatura) => async (anterior: EstadoLancamento, form: FormData) => {
    const r = await acao(anterior, form);
    if (r.ok) setAberto(false);
    return r;
  };
  const [estadoEdicao, salvar, salvando] = useActionState(fecharSeOk(editarAssinatura), {});
  const [estadoParar, parar, parando] = useActionState(fecharSeOk(pararAssinatura), {});
  const [estadoExcluir, excluir, excluindo] = useActionState(fecharSeOk(excluirCompra), {});
  const erro = estadoEdicao.erro ?? estadoParar.erro ?? estadoExcluir.erro;

  return (
    <li className="not-first:border-t not-first:border-border">
      <BottomSheet
        titulo="Assinatura"
        aberto={aberto}
        onAbertoChange={(v) => {
          setAberto(v);
          if (v) {
            setCentavos(l.valor);
            setCategoria(atual ? [atual] : []);
            setConfirmando(null);
          }
        }}
        gatilho={
          <button type="button" className="w-full rounded-md text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
            <TransactionRow l={l} meta={metaDe(l)} como="div" />
          </button>
        }
      >
        <form action={salvar} className="grid gap-4">
          <input type="hidden" name="compra_id" value={l.compraId ?? ''} />
          <p className="text-center text-xs font-semibold text-muted-foreground">
            Todo mês{l.cartao ? ` · ${l.cartao.nome}` : ''} · o valor novo vale desta fatura em diante
          </p>
          <AmountInput nome="valor_centavos" centavos={centavos} onChange={setCentavos} />
          <ChipsDeCategoria id={l.id} opcoes={opcoes} valor={categoria} onChange={setCategoria} />
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

        {confirmando === null && (
          <div className="grid gap-2">
            <Button type="button" variant="secondary" className="w-full" onClick={() => setConfirmando('parar')}>
              <Repeat aria-hidden />
              Parar de repetir
            </Button>
            <Button type="button" variant="destructive" className="w-full" onClick={() => setConfirmando('excluir')}>
              <Trash2 aria-hidden />
              Excluir assinatura
            </Button>
          </div>
        )}
        {confirmando === 'parar' && (
          <form action={parar} className="grid gap-3 rounded-md bg-muted p-4">
            <input type="hidden" name="compra_id" value={l.compraId ?? ''} />
            <p className="text-sm font-bold">Parar de repetir? Sai dos próximos meses; o que já passou e a fatura aberta ficam.</p>
            <div className="grid grid-cols-2 gap-2">
              <Button type="button" variant="ghost" onClick={() => setConfirmando(null)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={parando}>
                Sim, parar
              </Button>
            </div>
          </form>
        )}
        {confirmando === 'excluir' && (
          <form action={excluir} className="grid gap-3 rounded-md bg-negative-soft p-4">
            <input type="hidden" name="compra_id" value={l.compraId ?? ''} />
            <p className="text-sm font-bold text-negative">Excluir a assinatura de todos os meses? Isso não pode ser desfeito.</p>
            <div className="grid grid-cols-2 gap-2">
              <Button type="button" variant="ghost" onClick={() => setConfirmando(null)}>
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
