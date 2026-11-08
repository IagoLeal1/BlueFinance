'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { OpcaoDeMes } from '@/domain/datas';
import { cn } from '@/lib/utils';
import { BottomSheet } from './bottom-sheet';

/** Botão de calendário que abre a lista de meses (links ?mes=AAAA-MM; o mês atual vai para `base`). */
export function MesPicker({
  base,
  atual,
  meses,
  sobreODegrade = false,
}: {
  base: string;
  atual: string;
  meses: OpcaoDeMes[];
  /** No topo do Início o botão fica branco sobre o degradê. */
  sobreODegrade?: boolean;
}) {
  const [aberto, setAberto] = useState(false);
  return (
    <BottomSheet
      titulo="Escolher mês"
      aberto={aberto}
      onAbertoChange={setAberto}
      gatilho={
        <Button
          size="icon"
          variant="ghost"
          aria-label="Trocar mês"
          className={sobreODegrade ? 'bg-white/15 text-on-hero hover:bg-white/25 aria-expanded:bg-white/25' : undefined}
        >
          <Calendar aria-hidden />
        </Button>
      }
    >
      <ul className="grid">
        {meses.map(({ mes, titulo, hoje }) => (
          <li key={mes} className="not-first:border-t not-first:border-border">
            <Link
              href={hoje ? base : `${base}?mes=${mes}`}
              onClick={() => setAberto(false)}
              aria-current={mes === atual ? 'page' : undefined}
              className={cn('flex min-h-12 items-center font-semibold', mes === atual && 'text-primary')}
            >
              {titulo}
            </Link>
          </li>
        ))}
      </ul>
    </BottomSheet>
  );
}
