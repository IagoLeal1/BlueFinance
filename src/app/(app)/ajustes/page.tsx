import type { Metadata } from 'next';
import { Suspense } from 'react';
import { AvisoDaFatura } from '@/components/app/aviso-fatura';
import { Cartoes } from '@/components/app/cartoes';
import { TokenAtalho } from '@/components/app/token-atalho';
import { Button } from '@/components/ui/button';
import { supabaseServidor } from '@/lib/supabase/server';
import { listarCartoes } from '@/server/cartoes';
import { tokenAtivo } from '@/server/tokens';
import { sair } from './actions';

export const metadata: Metadata = { title: 'Ajustes · BlueFinance' };

const dataHora = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'short', timeStyle: 'short' });

export default function Ajustes() {
  return (
    <>
      <h1 className="mt-2 text-[28px] leading-[34px] font-extrabold tracking-tight">Ajustes</h1>
      <Suspense fallback={null}>
        <CartoesDoUsuario />
      </Suspense>
      <AvisoDaFatura />
      <section aria-label="Lançar sem abrir o app" className="grid gap-3 rounded-lg bg-card p-4 shadow-card">
        <h2 className="text-lg font-bold">Lançar sem abrir o app</h2>
        <ol className="grid gap-3">
          {[
            'Monte o Atalho "Gasto rápido" com o token abaixo (passo a passo no guia do projeto).',
            'Ajustes do iPhone › Botão de Ação › Atalho › Gasto rápido.',
            'Aperte o botão, escolha a categoria, digite o valor e, se quiser, com o quê.',
          ].map((passo, n) => (
            <li key={n} className="grid grid-cols-[28px_1fr] items-start gap-3 text-sm font-semibold">
              <span aria-hidden className="grid size-7 place-items-center rounded-full bg-secondary font-extrabold text-secondary-foreground">
                {n + 1}
              </span>
              {passo}
            </li>
          ))}
        </ol>
      </section>
      <section aria-label="Atalho do iPhone" className="grid gap-3 rounded-lg bg-card p-4 shadow-card">
        <h2 className="text-lg font-bold">Token do Atalho</h2>
        <p className="text-[13px] leading-[18px] font-semibold text-muted-foreground">
          O Atalho usa um token para lançar sem abrir o app. Gerar um novo desliga o anterior — use se perder o iPhone.
        </p>
        <Suspense fallback={null}>
          <EstadoDoToken />
        </Suspense>
      </section>
      <section aria-label="Conta" className="grid gap-1 rounded-lg bg-card p-4 shadow-card">
        <p className="text-[13px] leading-[18px] font-semibold text-muted-foreground">Conta</p>
        <Suspense fallback={null}>
          <EmailDaConta />
        </Suspense>
        <form action={sair}>
          <Button type="submit" variant="ghost" className="-ml-5 text-negative">
            Sair
          </Button>
        </form>
      </section>
    </>
  );
}

async function CartoesDoUsuario() {
  return <Cartoes cartoes={await listarCartoes()} />;
}

async function EmailDaConta() {
  const supabase = await supabaseServidor();
  const { data } = await supabase.auth.getClaims();
  return <p className="font-bold">{data?.claims.email ?? ''}</p>;
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
