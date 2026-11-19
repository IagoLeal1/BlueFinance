'use client';

import Link from 'next/link';
import { Menu } from '@base-ui/react/menu';
import { Check, ChevronDown } from 'lucide-react';
import { mesCurto, nomeDoMes, type OpcaoDeMes } from '@/domain/datas';
import { VIDRO_DO_TOPO } from './topo-flutuante';

/**
 * O mês no topo: uma pílula de vidro com o mês curto ("nov") que abre o menu de meses
 * (design-preview: #mes e .menu). Cada mês é um link (?mes=AAAA-MM; o mês atual vai para `base`).
 */
export function MesPicker({ base, atual, meses }: { base: string; atual: string; meses: OpcaoDeMes[] }) {
  return (
    <Menu.Root>
      <Menu.Trigger
        aria-label={`Trocar mês: ${nomeDoMes(atual)}`}
        className={`${VIDRO_DO_TOPO} inline-flex h-11 items-center gap-1 rounded-full pr-3.5 pl-4 text-[15px] font-semibold`}
      >
        {mesCurto(atual)}
        <ChevronDown className="size-4 transition-transform duration-(--t-agil) ease-agil in-aria-expanded:rotate-180" aria-hidden />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner side="bottom" align="end" sideOffset={8} className="z-50">
          <Menu.Popup aria-label="Escolher mês" className="menu-vidro">
            {meses.map(({ mes, titulo, hoje }) => (
              <Menu.LinkItem
                key={mes}
                closeOnClick
                render={<Link href={hoje ? base : `${base}?mes=${mes}`} />}
                aria-current={mes === atual ? 'page' : undefined}
                className="flex min-h-11 items-center justify-between gap-3 rounded-[18px] px-3.5 text-base font-medium outline-none data-highlighted:bg-foreground/8 aria-[current=page]:bg-foreground/8 aria-[current=page]:font-semibold"
              >
                {titulo}
                <Check className="invisible size-[18px] text-primary in-aria-[current=page]:visible" aria-hidden />
              </Menu.LinkItem>
            ))}
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}
