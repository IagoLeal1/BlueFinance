'use client';

import { useActionState, useState } from 'react';
import { Check, Plus } from 'lucide-react';
import { lancarTotalFatura, type EstadoLancamento } from '@/app/(app)/actions';
import { Button } from '@/components/ui/button';
import { nomeDoMes } from '@/domain/datas';
import { AmountInput } from './amount-input';
import { BottomSheet } from './bottom-sheet';
import { ChipsDeCategoria, type CategoriaEditavel } from './editar-lancamento';

/**
 * "Lançar o total da fatura" (design kit: TelaFaturaFechada): para a fatura fechada sem compras lançadas,
 * grava o valor total de uma vez, na categoria Outros (dá para trocar).
 */
export function LancarTotalFatura({
  cartao,
  mes,
  fechou,
  categorias,
}: {
  cartao: { id: string; nome: string };
  mes: string;
  fechou: number;
  categorias: CategoriaEditavel[];
}) {
  const opcoes = categorias.filter((c) => c.tipo === 'despesa');
  const outros = opcoes.find((c) => c.nome === 'Outros')?.id;
  const [aberto, setAberto] = useState(false);
  const [centavos, setCentavos] = useState(0);
  const [categoria, setCategoria] = useState<string[]>(outros ? [outros] : []);
  const [estado, salvar, salvando] = useActionState(async (anterior: EstadoLancamento, form: FormData) => {
    const r = await lancarTotalFatura(anterior, form);
    if (r.ok) setAberto(false);
    return r;
  }, {});

  return (
    <BottomSheet
      titulo="Total da fatura"
      aberto={aberto}
      onAbertoChange={(v) => {
        setAberto(v);
        if (v) {
          setCentavos(0);
          setCategoria(outros ? [outros] : []);
        }
      }}
      gatilho={
        <Button variant="ghost" className="-ml-5 justify-self-start">
          <Plus aria-hidden />
          Lançar o total da fatura
        </Button>
      }
    >
      <form action={salvar} className="grid gap-4">
        <input type="hidden" name="cartao_id" value={cartao.id} />
        <input type="hidden" name="mes" value={mes} />
        <p className="text-center text-xs font-semibold text-muted-foreground">
          {cartao.nome} · fatura de {nomeDoMes(mes)} (fechou dia {fechou})
        </p>
        <AmountInput nome="valor_centavos" centavos={centavos} onChange={setCentavos} />
        <ChipsDeCategoria id={`total-${cartao.id}`} opcoes={opcoes} valor={categoria} onChange={setCategoria} />
        {estado.erro && (
          <p role="alert" className="text-sm font-semibold text-negative">
            {estado.erro}
          </p>
        )}
        <Button type="submit" disabled={salvando} className="w-full">
          <Check aria-hidden />
          Salvar total
        </Button>
      </form>
    </BottomSheet>
  );
}
