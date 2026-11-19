import type { Metadata } from 'next';
import { Suspense } from 'react';
import { CabecaSub, CorpoSub } from '@/components/app/cabeca-sub';
import { Cartoes } from '@/components/app/cartoes';
import { listarCartoes } from '@/server/cartoes';

export const metadata: Metadata = { title: 'Cartões · BlueFinance' };

export default function AjustesCartoes() {
  return (
    <>
      <CabecaSub titulo="Cartões" />
      <CorpoSub>
        <Suspense fallback={null}>
          <CartoesDoUsuario />
        </Suspense>
      </CorpoSub>
    </>
  );
}

async function CartoesDoUsuario() {
  return <Cartoes cartoes={await listarCartoes()} />;
}
