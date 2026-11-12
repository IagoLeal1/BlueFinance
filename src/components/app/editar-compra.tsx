'use client';

import { useActionState, useState } from 'react';
import { Check, Trash2 } from 'lucide-react';
import { editarCompra, excluirCompra, type EstadoLancamento } from '@/app/(app)/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { diaCurto, diaDe, nomeDoMes, somarMeses } from '@/domain/datas';
import { formatBRL } from '@/domain/money';
import { dividirParcelas, mesDaFatura, mesesDasParcelas } from '@/domain/parcelas';
import { mesDe } from '@/domain/summary';
import type { Cartao } from '@/server/cartoes';
import type { LancamentoListado } from '@/server/lancamentos';
import { AmountInput } from './amount-input';
import { BottomSheet } from './bottom-sheet';
import { CampoQuando, dataDoDia } from './campo-quando';
import { CamposCredito, formasCom, type Forma } from './campos-credito';
import { ChipsDeCategoria, type CategoriaEditavel } from './editar-lancamento';
import { metaDe } from './meta';
import { Segmented } from './segmented';
import { TransactionRow } from './transaction-row';

/**
 * Parcela de uma compra no crédito (design kit: TelaEditarParcelada). Uma parcela nunca é editada
 * sozinha: tocar abre a compra inteira — total, parcelas, descrição e categoria; mudar o total ou
 * o número de parcelas refaz a divisão. Excluir apaga todas as parcelas.
 */
export function LinhaCompra({
  l,
  categorias,
  cartoes,
  temVr = false,
}: {
  l: LancamentoListado;
  categorias: CategoriaEditavel[];
  cartoes: Cartao[];
  temVr?: boolean;
}) {
  const totalOriginal = l.totalDaCompra ?? l.valor;
  const parcelasOriginais = l.parcelas ?? 1;
  const opcoes = categorias.filter((c) => c.tipo === 'despesa');
  const atual = opcoes.find((c) => c.nome === l.categoria)?.id;
  // Sem mudar data nem cartão, a fatura da 1ª parcela fica onde está; com data ou cartão novos, é recalculada.
  const primeiroMesAtual = somarMeses(l.mes ?? mesDe(l.data), -((l.parcela ?? 1) - 1));
  const diaAtual = diaDe(l.data);
  const cartaoAtual = l.cartao?.id ? [l.cartao.id] : [];

  const [aberto, setAberto] = useState(false);
  const [centavos, setCentavos] = useState(totalOriginal);
  const [parcelas, setParcelas] = useState(parcelasOriginais);
  const [categoria, setCategoria] = useState<string[]>(atual ? [atual] : []);
  const [dia, setDia] = useState(diaAtual);
  const [forma, setForma] = useState<Forma>('credito');
  const [cartaoId, setCartaoId] = useState<string[]>(cartaoAtual);
  const [confirmando, setConfirmando] = useState(false);

  const fecharSeOk = (acao: typeof editarCompra) => async (anterior: EstadoLancamento, form: FormData) => {
    const r = await acao(anterior, form);
    if (r.ok) setAberto(false);
    return r;
  };
  const [estadoEdicao, salvar, salvando] = useActionState(fecharSeOk(editarCompra), {});
  const [estadoExclusao, excluir, excluindo] = useActionState(fecharSeOk(excluirCompra), {});
  const erro = estadoEdicao.erro ?? estadoExclusao.erro;

  const cartao = cartoes.find((c) => c.id === cartaoId[0]);
  const mudouFatura = dia !== diaAtual || cartaoId[0] !== cartaoAtual[0];
  const primeiroMes = mudouFatura && cartao ? mesDaFatura(dataDoDia(dia), cartao.diaFechamento) : primeiroMesAtual;
  const meses = mesesDasParcelas(primeiroMes, parcelas);
  const valores = dividirParcelas(centavos, parcelas);
  const varias = parcelasOriginais > 1;

  return (
    <li className="not-first:border-t not-first:border-border">
      <BottomSheet
        titulo={varias ? 'Compra parcelada' : 'Compra no crédito'}
        aberto={aberto}
        onAbertoChange={(v) => {
          setAberto(v);
          if (v) {
            setCentavos(totalOriginal);
            setParcelas(parcelasOriginais);
            setCategoria(atual ? [atual] : []);
            setDia(diaAtual);
            setForma('credito');
            setCartaoId(cartaoAtual);
            setConfirmando(false);
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
          <p className="text-center text-xs font-semibold text-muted-foreground">Valor total</p>
          <AmountInput nome="valor_centavos" centavos={centavos} onChange={setCentavos} />
          <CampoQuando id={l.id} dia={dia} onChange={setDia} />
          <div className="grid gap-2">
            <Label>Como pagou</Label>
            <Segmented nome="forma" rotulo="Como pagou" opcoes={formasCom(temVr)} valor={forma} onChange={setForma} />
          </div>
          {forma === 'credito' ? (
            <>
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
                nota={false}
                onIrAjustes={() => setAberto(false)}
              />
              <ul className="px-1">
                {valores.map((valor, i) => (
                  <li key={meses[i]} className="flex min-h-10 items-center justify-between gap-3 text-sm font-semibold not-first:border-t not-first:border-border">
                    <span>
                      {i + 1}/{parcelas} · fatura de {nomeDoMes(meses[i]!)}
                    </span>
                    <span className="tabular-nums">{formatBRL(valor)}</span>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <>
              <input type="hidden" name="parcelas" value={1} />
              <p className="rounded-md bg-muted px-3 py-2.5 text-[13px] leading-[18px] font-semibold text-muted-foreground">
                Vira um gasto só de {formatBRL(centavos)} em {diaCurto(dataDoDia(dia))}.
              </p>
            </>
          )}
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

        {!confirmando ? (
          <Button type="button" variant="destructive" className="w-full" onClick={() => setConfirmando(true)}>
            <Trash2 aria-hidden />
            {varias ? `Excluir as ${parcelasOriginais} parcelas` : 'Excluir compra'}
          </Button>
        ) : (
          <form action={excluir} className="grid gap-3 rounded-md bg-negative-soft p-4">
            <input type="hidden" name="compra_id" value={l.compraId ?? ''} />
            <p className="text-sm font-bold text-negative">
              {varias ? `Excluir as ${parcelasOriginais} parcelas de vez?` : 'Excluir de vez?'} Isso não pode ser desfeito.
            </p>
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
