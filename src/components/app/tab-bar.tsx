'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useRef, useState } from 'react';
import { House, Receipt, Settings, TrendingUp, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

const ABAS: { href: string; rotulo: string; Icone: LucideIcon }[] = [
  { href: '/', rotulo: 'Início', Icone: House },
  { href: '/lancamentos', rotulo: 'Lançamentos', Icone: Receipt },
  { href: '/investimentos', rotulo: 'Investir', Icone: TrendingUp },
  { href: '/ajustes', rotulo: 'Ajustes', Icone: Settings },
];

const abaDe = (caminho: string) => {
  const i = ABAS.findIndex(({ href }) => (href === '/' ? caminho === '/' : caminho.startsWith(href)));
  return i < 0 ? 0 : i;
};

/**
 * Barra de abas flutuante de vidro (design-preview: .abas): quatro abas de largura igual com uma lente que
 * desliza com a mola viva, e o botão + redondo à direita. Nas abas das pontas a lente bate na borda e amassa,
 * em vez de passar dela.
 */
export function TabBar({ mais }: { mais?: React.ReactNode }) {
  const caminho = usePathname();
  // A lente vai na hora do toque, antes da tela nova chegar; quando o caminho muda, ele manda.
  const [toque, setToque] = useState<{ de: string; aba: number } | null>(null);
  const atual = toque && toque.de === caminho ? toque.aba : abaDe(caminho);
  const lente = useRef<HTMLSpanElement>(null);

  function tocar(n: number) {
    if (n !== atual) setToque({ de: caminho, aba: n });
    const el = lente.current;
    if (!el || n === atual || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const ponta = n === 0 || n === ABAS.length - 1;
    el.style.transformOrigin = n === 0 ? 'left center' : ponta ? 'right center' : 'center';
    el.animate(
      ponta
        ? [{ scale: '1 1' }, { scale: '1.1 0.92', offset: 0.22 }, { scale: '0.84 1.07', offset: 0.55 }, { scale: '1.03 0.99', offset: 0.8 }, { scale: '1 1' }]
        : [{ scale: '1 1' }, { scale: '1.14 0.9', offset: 0.35 }, { scale: '1 1' }],
      { duration: ponta ? 520 : 420, easing: 'ease-out' },
    );
  }

  const ponta = atual === 0 || atual === ABAS.length - 1;
  return (
    <div className="fixed inset-x-0 bottom-[max(calc(env(safe-area-inset-bottom)-8px),12px)] z-40 mx-auto flex max-w-[480px] items-center gap-2 px-4">
      <nav aria-label="Principal" className="vidro relative grid h-[62px] flex-1 grid-cols-4 rounded-[31px] p-1">
        <span
          ref={lente}
          aria-hidden
          style={{ '--aba': atual } as React.CSSProperties}
          className={cn(
            'lente-aba absolute inset-y-1 left-1 w-[calc((100%-8px)/4)] translate-x-[calc(var(--aba)*100%)] rounded-[27px] transition-transform motion-reduce:transition-none',
            ponta ? 'duration-(--t-calma) ease-calma' : 'duration-(--t-viva) ease-viva',
          )}
        />
        {ABAS.map(({ href, rotulo, Icone }, n) => (
          <Link
            key={href}
            href={href}
            onClick={() => tocar(n)}
            aria-current={n === abaDe(caminho) ? 'page' : undefined}
            className={cn(
              'relative z-[1] flex h-[54px] flex-col items-center justify-center gap-[3px] rounded-[27px] text-[9px] leading-[11px] font-semibold tracking-[-0.01em] whitespace-nowrap text-muted-foreground transition-colors',
              n === atual && 'text-primary',
            )}
          >
            <Icone className="size-[23px]" aria-hidden />
            {rotulo}
          </Link>
        ))}
      </nav>
      {mais}
    </div>
  );
}
