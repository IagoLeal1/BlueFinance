import Link from 'next/link';
import { ChevronRight, WalletCards } from 'lucide-react';
import { diaCurto } from '@/domain/datas';
import { formatBRL, formatReais } from '@/domain/money';
import type { Vr } from '@/server/vr';
import { Privado } from './privado';

/** Início: o VR num card menor, abaixo do saldo da conta; tocar abre o extrato do VR (design kit: TelaVr). */
export function CartaoVr({ vr }: { vr: Pick<Vr, 'saldo' | 'proximo' | 'valorMensal'> }) {
  return (
    <section aria-label="VR" className="cartao">
      <Link href="/lancamentos?ver=vr" className="pressiona flex items-center gap-3 rounded-lg px-4 py-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-[12px] bg-cat-4-soft text-cat-4">
          <WalletCards className="size-5" aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] leading-5 font-semibold">VR</span>
          <span className="block text-[13px] leading-[18px] text-muted-foreground">
            Próximo: {formatReais(vr.valorMensal)} em {diaCurto(`${vr.proximo}T12:00:00-03:00`).replaceAll(' ', ' ')}
          </span>
        </span>
        <span className="text-right">
          <span className="block text-xs font-semibold text-muted-foreground">Saldo</span>
          <span className="block text-xl font-bold font-valor tabular-nums">
            <Privado>{formatBRL(vr.saldo)}</Privado>
          </span>
        </span>
        <ChevronRight className="size-5 text-muted-foreground" aria-hidden />
      </Link>
    </section>
  );
}
