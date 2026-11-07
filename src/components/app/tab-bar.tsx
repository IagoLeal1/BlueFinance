'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { House, Receipt, Settings, TrendingUp, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

const ABAS: { href: string; rotulo: string; Icone: LucideIcon }[] = [
  { href: '/', rotulo: 'Início', Icone: House },
  { href: '/lancamentos', rotulo: 'Lançamentos', Icone: Receipt },
  { href: '/investimentos', rotulo: 'Investir', Icone: TrendingUp },
  { href: '/ajustes', rotulo: 'Ajustes', Icone: Settings },
];

/** Barra de abas fixa no rodapé (design kit: TabBar). O slot central fica para o botão +. */
export function TabBar({ centro }: { centro?: React.ReactNode }) {
  const caminho = usePathname();
  const aba = ({ href, rotulo, Icone }: (typeof ABAS)[number]) => {
    const ativa = href === '/' ? caminho === '/' : caminho.startsWith(href);
    return (
      <Link
        key={href}
        href={href}
        aria-current={ativa ? 'page' : undefined}
        className={cn(
          'grid min-h-11 justify-items-center gap-0.5 text-[11px] leading-[14px] font-bold text-muted-foreground',
          ativa && 'text-primary',
        )}
      >
        <Icone className="size-6" aria-hidden />
        {rotulo}
      </Link>
    );
  };
  return (
    <nav
      aria-label="Principal"
      className="fixed inset-x-0 bottom-0 z-40 mx-auto grid h-[84px] max-w-[480px] grid-cols-5 items-start border-t border-border bg-surface pt-2 pb-[env(safe-area-inset-bottom)]"
    >
      {aba(ABAS[0]!)}
      {aba(ABAS[1]!)}
      <div className="grid justify-items-center">{centro}</div>
      {aba(ABAS[2]!)}
      {aba(ABAS[3]!)}
    </nav>
  );
}
