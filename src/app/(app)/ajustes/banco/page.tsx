import type { Metadata } from 'next';
import { Suspense } from 'react';
import { BancoAjustes } from '@/components/app/banco-ajustes';
import { CabecaSub, CorpoSub } from '@/components/app/cabeca-sub';
import { bancoDoUsuario } from '@/server/banco';

export const metadata: Metadata = { title: 'Banco · BlueFinance' };

export default function AjustesBanco() {
  return (
    <>
      <CabecaSub titulo="Banco" />
      <CorpoSub>
        <Suspense fallback={null}>
          <BancoDoUsuario />
        </Suspense>
      </CorpoSub>
    </>
  );
}

async function BancoDoUsuario() {
  return <BancoAjustes banco={await bancoDoUsuario()} />;
}
