'use client';

import Link from 'next/link';
import { CalendarDays, CreditCard, Repeat } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { diaDe, nomeDoMes } from '@/domain/datas';
import { formatBRL } from '@/domain/money';
import { mesDaFatura, mesesDasParcelas } from '@/domain/parcelas';
import type { Cartao } from '@/server/cartoes';
import { CHIP } from './estilos';
import { Stepper } from './stepper';

export type Forma = 'debito' | 'pix' | 'credito' | 'vr';
export const FORMAS: { valor: Forma; rotulo: string }[] = [
  { valor: 'debito', rotulo: 'Débito' },
  { valor: 'pix', rotulo: 'Pix' },
  { valor: 'credito', rotulo: 'Crédito' },
];
/** "Como pagou" com o VR no fim, para quem configurou o VR (design kit: TelaVr). */
export const formasCom = (temVr: boolean) => (temVr ? [...FORMAS, { valor: 'vr' as const, rotulo: 'VR' }] : FORMAS);
export const CHAVE_CARTAO = 'bf:ultimo-cartao';

/** "3x de R$ 400,00" — o valor de cada parcela (os centavos que sobram vão na 1ª). */
export const rotuloParcelas = (total: number, n: number) => `${n}x de ${formatBRL(Math.floor(total / n))}`;

/** Cartão já marcado ao escolher Crédito: o último usado, senão o primeiro cadastrado. */
export function cartaoInicial(cartoes: Cartao[]): string[] {
  const ultimo = typeof localStorage === 'undefined' ? null : localStorage.getItem(CHAVE_CARTAO);
  const c = cartoes.find((x) => x.id === ultimo) ?? cartoes[0];
  return c ? [c.id] : [];
}

/**
 * Em qual fatura cai a compra (pela data e pelo dia de fechamento) e, se parcelada, em qual mês termina.
 * No botão + a compra é de hoje; ao editar, é a data escolhida em "Quando".
 */
function NotaFatura({ cartao, parcelas, dataCompra, edicao }: { cartao: Cartao; parcelas: number; dataCompra: string; edicao: boolean }) {
  const meses = mesesDasParcelas(mesDaFatura(dataCompra, cartao.diaFechamento), parcelas);
  const dia = Number(diaDe(dataCompra).slice(8));
  const porque = `(o ${cartao.nome} fecha dia ${cartao.diaFechamento}; ${edicao ? `comprado dia ${dia}` : `hoje é ${dia}`})`;
  return (
    <p className="flex gap-2 rounded-md bg-muted px-3 py-2.5 text-[13px] leading-[18px] font-semibold text-muted-foreground">
      <CalendarDays className="mt-px size-4 shrink-0" aria-hidden />
      {parcelas > 1 ? (
        <span>
          1ª parcela na fatura de <b className="text-foreground">{nomeDoMes(meses[0]!)}</b> {porque}. Última em{' '}
          {nomeDoMes(meses.at(-1)!)}.
        </span>
      ) : (
        <span>
          {edicao ? 'Vai para' : 'Cai na'} fatura de <b className="text-foreground">{nomeDoMes(meses[0]!)}</b> {porque}.
        </span>
      )}
    </p>
  );
}

/** Cartão, parcelas e a nota da fatura — no botão + e ao editar um gasto (design kit: TelaCredito, TelaEditarGasto). */
export function CamposCredito({
  id,
  cartoes,
  cartaoId,
  onCartao,
  parcelas,
  onParcelas,
  centavos,
  dataCompra,
  edicao = false,
  nota = true,
  todoMes = false,
  onTodoMes,
  onIrAjustes,
}: {
  id: string;
  cartoes: Cartao[];
  cartaoId: string[];
  onCartao: (v: string[]) => void;
  parcelas: number;
  onParcelas: (n: number) => void;
  centavos: number;
  dataCompra: string;
  edicao?: boolean;
  /** Mostra a nota de em qual fatura cai (a compra parcelada mostra a lista dos meses no lugar). */
  nota?: boolean;
  /** "Todo mês" (assinatura): só no botão +. Troca as parcelas pelo mesmo valor em toda fatura. */
  todoMes?: boolean;
  onTodoMes?: (v: boolean) => void;
  onIrAjustes: () => void;
}) {
  if (cartoes.length === 0) {
    return (
      <p className="text-[13px] font-semibold text-muted-foreground">
        Cadastre seu cartão em{' '}
        <Link href="/ajustes" className="text-primary underline" onClick={onIrAjustes}>
          Ajustes
        </Link>{' '}
        para lançar no crédito.
      </p>
    );
  }
  const cartao = cartoes.find((c) => c.id === cartaoId[0]);
  return (
    <>
      <div className="grid gap-2">
        <Label id={`rotulo-cartao-${id}`}>Cartão</Label>
        <ToggleGroup
          aria-labelledby={`rotulo-cartao-${id}`}
          value={cartaoId}
          onValueChange={(v) => (v as string[]).length > 0 && onCartao(v as string[])}
          className="flex w-full flex-wrap gap-2"
        >
          {cartoes.map((c) => (
            <ToggleGroupItem key={c.id} value={c.id} className={CHIP}>
              <CreditCard className="size-4" aria-hidden />
              {c.nome}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <input type="hidden" name="cartao_id" value={cartaoId[0] ?? ''} />
      </div>
      {onTodoMes && (
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="font-bold">Todo mês</p>
            <p className="text-[13px] leading-[18px] font-semibold text-muted-foreground">Assinatura: repete na fatura até você parar.</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={todoMes}
            aria-label="Todo mês"
            onClick={() => onTodoMes(!todoMes)}
            className="relative h-[31px] w-[51px] shrink-0 rounded-full bg-line-strong/40 transition-colors aria-checked:bg-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <span
              aria-hidden
              className={`absolute top-0.5 left-0.5 size-[27px] rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.25)] transition-transform ${todoMes ? 'translate-x-5' : ''}`}
            />
          </button>
          {todoMes && <input type="hidden" name="recorrente" value="1" />}
        </div>
      )}
      {todoMes ? (
        cartao && (
          <p className="flex gap-2 rounded-md bg-muted px-3 py-2.5 text-[13px] leading-[18px] font-semibold text-muted-foreground">
            <Repeat className="mt-px size-4 shrink-0" aria-hidden />
            <span>
              Cai todo mês a partir da fatura de <b className="text-foreground">{nomeDoMes(mesDaFatura(dataCompra, cartao.diaFechamento))}</b>.
            </span>
          </p>
        )
      ) : (
        <>
          <div className="grid gap-2">
            <Label>Parcelas</Label>
            <Stepper valor={parcelas} min={1} max={24} onChange={onParcelas} rotulo={(n) => rotuloParcelas(centavos, n)} />
            <input type="hidden" name="parcelas" value={parcelas} />
          </div>
          {nota && cartao && <NotaFatura cartao={cartao} parcelas={parcelas} dataCompra={dataCompra} edicao={edicao} />}
        </>
      )}
    </>
  );
}
