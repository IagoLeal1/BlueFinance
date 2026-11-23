'use client';

import { useState, useTransition } from 'react';
import { CreditCard, Info } from 'lucide-react';
import { salvarCartaoCarteira } from '@/app/(app)/ajustes/actions';
import type { CartaoDaCarteira } from '@/server/apple-pay';
import { Segmented } from './segmented';

const valorDe = (c: CartaoDaCarteira) => (c.forma === 'credito' && c.cartaoId ? `credito:${c.cartaoId}` : c.forma === 'credito' ? 'debito' : c.forma);

/** Um cartão da Carteira e como ele entra: Débito, Crédito (num cartão do app) ou VR. Salva ao tocar. */
function CartaoDaCarteiraLinha({ c, opcoes }: { c: CartaoDaCarteira; opcoes: { valor: string; rotulo: string }[] }) {
  const [valor, setValor] = useState(valorDe(c));
  const [erro, setErro] = useState<string | null>(null);
  const [, iniciar] = useTransition();
  return (
    <li className="grid grid-cols-[minmax(0,1fr)] gap-2 py-3 not-first:border-t not-first:border-border">
      <div className="flex items-center gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-[12px] bg-muted text-muted-foreground">
          <CreditCard className="size-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-bold">{c.nome}</p>
          <p className="text-[13px] leading-[18px] text-muted-foreground">na Carteira do iPhone</p>
        </div>
      </div>
      <Segmented
        nome={`carteira-${c.nome}`}
        rotulo={c.nome}
        opcoes={opcoes}
        valor={valor}
        onChange={(v) => {
          const antes = valor;
          setValor(v);
          setErro(null);
          iniciar(async () => {
            const r = await salvarCartaoCarteira(c.nome, v);
            if (r.erro) {
              setValor(antes);
              setErro(r.erro);
            }
          });
        }}
      />
      {erro && (
        <p role="alert" className="text-sm font-semibold text-negative">
          {erro}
        </p>
      )}
    </li>
  );
}

/**
 * Ajustes › Apple Pay (design kit: TelaApplePay): como cada cartão da Carteira entra e o passo a passo da automação
 * "Carteira" do app Atalhos.
 */
export function ApplePayAjustes({
  cartoes,
  doApp,
  temVr,
}: {
  cartoes: CartaoDaCarteira[];
  /** Cartões de crédito do app, para "Crédito · {cartão}". */
  doApp: { id: string; nome: string }[];
  temVr: boolean;
}) {
  const opcoes = [
    { valor: 'debito', rotulo: 'Débito' },
    // Com um cartão só no app, "Crédito" basta; com mais de um, o nome diz qual.
    ...doApp.map((c) => ({ valor: `credito:${c.id}`, rotulo: doApp.length === 1 ? 'Crédito' : `Crédito · ${c.nome}` })),
    ...(temVr ? [{ valor: 'vr', rotulo: 'VR' }] : []),
  ];
  return (
    <section aria-label="Apple Pay" className="grid gap-3 cartao p-4">
      <h2 className="text-[17px] leading-[22px] font-semibold">Apple Pay</h2>
      <p className="text-[13px] leading-[18px] text-muted-foreground">
        {cartoes.length === 0
          ? 'Nenhum cartão ainda: cada cartão da Carteira aparece aqui depois do primeiro pagamento.'
          : 'Cada cartão aparece aqui depois do primeiro pagamento. Escolha como ele entra.'}
      </p>
      {cartoes.length > 0 && (
        <ul>
          {cartoes.map((c) => (
            <CartaoDaCarteiraLinha key={c.nome} c={c} opcoes={opcoes} />
          ))}
        </ul>
      )}
      <p className="text-[13px] leading-[18px] font-bold text-muted-foreground">Montar a automação (uma vez)</p>
      <ol className="grid gap-2 pl-5 text-sm font-semibold [list-style:decimal]">
        <li>
          Atalhos › + › atalho <b>BlueFin · Apple Pay</b>
        </li>
        <li>
          1º bloco: Automação › <b>Carteira</b> (quando qualquer cartão for aproximado)
        </li>
        <li>
          Depois: o token do Atalho e o envio para o BlueFin (guia do projeto)
        </li>
      </ol>
      <p className="flex gap-2 rounded-md bg-muted px-3 py-2.5 text-[13px] leading-[18px] text-muted-foreground">
        <Info className="mt-px size-4 shrink-0" aria-hidden />
        <span>Só pega o Apple Pay (encostando o iPhone ou o Watch). Cartão físico, Pix e compra online chegam pelo banco, no dia seguinte.</span>
      </p>
    </section>
  );
}
