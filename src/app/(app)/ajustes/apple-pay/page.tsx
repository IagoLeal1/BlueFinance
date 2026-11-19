import type { Metadata } from 'next';
import { Suspense } from 'react';
import { ApplePayAjustes } from '@/components/app/apple-pay-ajustes';
import { CabecaSub, CorpoSub } from '@/components/app/cabeca-sub';
import { cartoesDaCarteira } from '@/server/apple-pay';
import { listarCartoes } from '@/server/cartoes';
import { vrDoUsuario } from '@/server/vr';

export const metadata: Metadata = { title: 'Apple Pay · BlueFinance' };

export default function AjustesApplePay() {
  return (
    <>
      <CabecaSub titulo="Apple Pay" />
      <CorpoSub>
        <Suspense fallback={null}>
          <ApplePayDoUsuario />
        </Suspense>
      </CorpoSub>
    </>
  );
}

async function ApplePayDoUsuario() {
  const [cartoes, doApp, vr] = await Promise.all([cartoesDaCarteira(), listarCartoes(), vrDoUsuario()]);
  return <ApplePayAjustes cartoes={cartoes} doApp={doApp.map((c) => ({ id: c.id, nome: c.nome }))} temVr={!!vr} />;
}
