'use client';

import { useActionState, useState } from 'react';
import { Check, Trash2 } from 'lucide-react';
import { editarLancamento, excluirLancamento, type EstadoLancamento } from '@/app/(app)/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { diaDe } from '@/domain/datas';
import type { Cartao } from '@/server/cartoes';
import type { LancamentoListado } from '@/server/lancamentos';
import { AmountInput } from './amount-input';
import { BottomSheet } from './bottom-sheet';
import { CampoQuando, dataDoDia } from './campo-quando';
import { CamposCredito, FORMAS, cartaoInicial, type Forma } from './campos-credito';
import { CHIP } from './estilos';
import { IconeCategoria } from './icone-categoria';
import { metaDe } from './meta';
import { Segmented } from './segmented';
import { TransactionRow } from './transaction-row';

export interface CategoriaEditavel {
  id: string;
  nome: string;
  tipo: string;
  icone: string;
}

/** Chips para trocar a categoria (envia `categoria_id`). */
export function ChipsDeCategoria({
  id,
  opcoes,
  valor,
  onChange,
}: {
  id: string;
  opcoes: CategoriaEditavel[];
  valor: string[];
  onChange: (v: string[]) => void;
}) {
  if (opcoes.length === 0) return null;
  return (
    <div className="grid gap-2">
      <Label id={`rotulo-cat-${id}`}>Categoria</Label>
      <ToggleGroup
        aria-labelledby={`rotulo-cat-${id}`}
        value={valor}
        onValueChange={(v) => onChange(v as string[])}
        className="flex w-full flex-wrap gap-2"
      >
        {opcoes.map((c) => (
          <ToggleGroupItem key={c.id} value={c.id} className={CHIP}>
            <IconeCategoria nome={c.icone} className="size-4" />
            {c.nome}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      <input type="hidden" name="categoria_id" value={valor[0] ?? ''} />
    </div>
  );
}

/**
 * Linha de lançamento que, ao tocar, abre o sheet para editar (valor, data, categoria, como pagou, descrição)
 * ou excluir (design kit: TelaEditar, TelaEditarGasto). Débito/Pix → Crédito vira compra no cartão.
 */
export function LinhaEditavel({ l, categorias, cartoes }: { l: LancamentoListado; categorias: CategoriaEditavel[]; cartoes: Cartao[] }) {
  const [aberto, setAberto] = useState(false);
  const opcoes = l.tipo === 'investimento' ? [] : categorias.filter((c) => c.tipo === l.tipo);
  const atual = opcoes.find((c) => c.nome === l.categoria)?.id;
  const formaAtual: Forma = l.forma ?? 'debito';
  const [categoria, setCategoria] = useState<string[]>(atual ? [atual] : []);
  const [centavos, setCentavos] = useState(l.valor);
  const [dia, setDia] = useState(diaDe(l.data));
  const [forma, setForma] = useState<Forma>(formaAtual);
  const [cartaoId, setCartaoId] = useState<string[]>([]);
  const [parcelas, setParcelas] = useState(1);
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
            setCategoria(atual ? [atual] : []);
            setDia(diaDe(l.data));
            setForma(formaAtual);
            setParcelas(1);
            setConfirmando(false);
          }
        }}
        gatilho={
          <button type="button" className="w-full text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring rounded-md">
            <TransactionRow l={l} meta={metaDe(l)} como="div" />
          </button>
        }
      >
        <form action={salvar} className="grid gap-4">
          <input type="hidden" name="id" value={l.id} />
          <AmountInput nome="valor_centavos" centavos={centavos} onChange={setCentavos} />
          <CampoQuando id={l.id} dia={dia} onChange={setDia} />
          <ChipsDeCategoria id={l.id} opcoes={opcoes} valor={categoria} onChange={setCategoria} />
          {l.tipo === 'despesa' && (
            <div className="grid gap-2">
              <Label>Como pagou</Label>
              <Segmented
              nome="forma"
              rotulo="Como pagou"
              opcoes={FORMAS}
              valor={forma}
              onChange={(f) => {
                setForma(f);
                  if (f === 'credito' && cartaoId.length === 0) setCartaoId(cartaoInicial(cartoes));
                }}
              />
            </div>
          )}
          {l.tipo === 'despesa' && forma === 'credito' && (
            <CamposCredito
              id={l.id}
              cartoes={cartoes}
              cartaoId={cartaoId}
              onCartao={setCartaoId}
              parcelas={parcelas}
              onParcelas={setParcelas}
              centavos={centavos}
              dataCompra={dataDoDia(dia)}
              edicao
              onIrAjustes={() => setAberto(false)}
            />
          )}
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
