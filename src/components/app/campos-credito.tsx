'use client';

import Link from 'next/link';
import { CalendarDays, CreditCard } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { diaDe, nomeDoMes } from '@/domain/datas';
import { formatBRL } from '@/domain/money';
import { mesDaFatura, mesesDasParcelas } from '@/domain/parcelas';
import type { Cartao } from '@/server/cartoes';
import { CHIP } from './estilos';
import { Stepper } from './stepper';

export type Forma = 'debito' | 'pix' | 'credito';
export const FORMAS: { valor: Forma; rotulo: string }[] = [
  { valor: 'debito', rotulo: 'Débito' },
  { valor: 'pix', rotulo: 'Pix' },
  { valor: 'credito', rotulo: 'Crédito' },
];
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
      <div className="grid gap-2">
        <Label>Parcelas</Label>
        <Stepper valor={parcelas} min={1} max={24} onChange={onParcelas} rotulo={(n) => rotuloParcelas(centavos, n)} />
        <input type="hidden" name="parcelas" value={parcelas} />
      </div>
      {cartao && <NotaFatura cartao={cartao} parcelas={parcelas} dataCompra={dataCompra} edicao={edicao} />}
    </>
  );
}
