import type { Metadata } from 'next';
import { Suspense } from 'react';
import { TokenAtalho } from '@/components/app/token-atalho';
import { Button } from '@/components/ui/button';
import { supabaseServidor } from '@/lib/supabase/server';
import { tokenAtivo } from '@/server/tokens';
import { sair } from './actions';

export const metadata: Metadata = { title: 'Ajustes · BlueFinance' };

const dataHora = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'short', timeStyle: 'short' });

export default function Ajustes() {
  return (
    <>
      <h1 className="mt-2 text-[28px] leading-[34px] font-extrabold tracking-tight">Ajustes</h1>
      <section aria-label="Atalho do iPhone" className="grid gap-3 rounded-lg bg-card p-4 shadow-card">
        <h2 className="text-lg font-bold">Atalho do iPhone</h2>
        <p className="text-[13px] leading-[18px] font-semibold text-muted-foreground">
          O Atalho &ldquo;Gasto rápido&rdquo; usa um token para lançar sem abrir o app. Gerar um novo desliga o anterior.
        </p>
        <Suspense fallback={null}>
          <EstadoDoToken />
        </Suspense>
      </section>
      <form action={sair}>
        <Button type="submit" variant="ghost" className="w-full">
          Sair
        </Button>
      </form>
    </>
  );
}

async function EstadoDoToken() {
  const supabase = await supabaseServidor();
  const { data } = await supabase.auth.getClaims();
  const ativo = data?.claims.sub ? await tokenAtivo(data.claims.sub) : null;
  return (
    <>
      {ativo && (
        <p className="text-[13px] leading-[18px] font-semibold">
          Token criado em {dataHora.format(new Date(ativo.criadoEm))}
          {ativo.usadoEm ? ` · usado pela última vez em ${dataHora.format(new Date(ativo.usadoEm))}` : ' · ainda não usado'}
        </p>
      )}
      <TokenAtalho jaExiste={!!ativo} />
    </>
  );
}
