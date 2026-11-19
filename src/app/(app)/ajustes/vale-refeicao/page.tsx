import type { Metadata } from 'next';
import { Suspense } from 'react';
import { CabecaSub, CorpoSub } from '@/components/app/cabeca-sub';
import { ConfigurarVr } from '@/components/app/vr-ajustes';
import { vrDoUsuario } from '@/server/vr';

export const metadata: Metadata = { title: 'Vale-refeição · BlueFinance' };

export default function AjustesVr() {
  return (
    <>
      <CabecaSub titulo="Vale-refeição" />
      <CorpoSub>
        <Suspense fallback={null}>
          <VrDoUsuario />
        </Suspense>
      </CorpoSub>
    </>
  );
}

async function VrDoUsuario() {
  const vr = await vrDoUsuario();
  return <ConfigurarVr vr={vr && { valorMensal: vr.valorMensal, dia: vr.dia, saldo: vr.saldo }} />;
}
