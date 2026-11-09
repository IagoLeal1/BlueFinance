'use client';

import { TrendingUp } from 'lucide-react';
import { diaCurto, diaDe } from '@/domain/datas';
import { comecaARender, percentualDoCdi } from '@/domain/rendimento';

const SEMANA = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];

/** "hoje", ou o próximo dia útil: "segunda, 9 nov". */
function aPartirDe(hoje: string): string {
  const dia = comecaARender(hoje);
  if (dia === hoje) return 'hoje';
  return `${SEMANA[new Date(`${dia}T12:00:00Z`).getUTCDay()]}, ${diaCurto(`${dia}T12:00:00-03:00`)}`;
}

/** Nota do aporte num investimento pelo CDI: soma no mesmo acúmulo e diz quando começa a render (design kit: TelaInvestimentoCdi). */
export function NotaAporte({ nome, instituicao, percentual }: { nome: string; instituicao: string; percentual: number }) {
  return (
    <p className="flex gap-2 rounded-md bg-muted px-3 py-2.5 text-[13px] leading-[18px] font-semibold text-muted-foreground">
      <TrendingUp className="mt-px size-4 shrink-0" aria-hidden />
      <span>
        Entra no <b className="text-foreground">{nome}</b> ({instituicao}), no mesmo acúmulo, e rende {percentualDoCdi(percentual)} a partir de{' '}
        <b className="text-foreground">{aPartirDe(diaDe(new Date()))}</b>.
      </span>
    </p>
  );
}
