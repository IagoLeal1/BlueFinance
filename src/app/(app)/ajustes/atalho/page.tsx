import type { Metadata } from 'next';
import { Suspense } from 'react';
import { TriangleAlert } from 'lucide-react';
import { CabecaSub, CorpoSub } from '@/components/app/cabeca-sub';
import { TokenAtalho } from '@/components/app/token-atalho';
import { supabaseServidor } from '@/lib/supabase/server';
import { tokenAtivo } from '@/server/tokens';

export const metadata: Metadata = { title: 'Atalho do iPhone · BlueFinance' };

const dataHora = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'short', timeStyle: 'short' });

export default function AjustesAtalho() {
  return (
    <>
      <CabecaSub titulo="Atalho do iPhone" />
      <CorpoSub>
        <section aria-label="Lançar sem abrir o app" className="cartao grid gap-3 p-4">
          <h2 className="text-[17px] leading-[22px] font-semibold">Lançar sem abrir o app</h2>
          <ol className="grid gap-3">
            {[
              'Monte o Atalho "Gasto rápido" com o token abaixo (passo a passo no guia do projeto).',
              'Ajustes do iPhone › Botão de Ação › Atalho › Gasto rápido.',
              'Aperte o botão, escolha a categoria, digite o valor e, se quiser, com o quê.',
            ].map((passo, n) => (
              <li key={n} className="grid grid-cols-[28px_1fr] items-start gap-3 text-[15px] leading-5">
                <span aria-hidden className="grid size-7 place-items-center rounded-full bg-secondary font-semibold text-secondary-foreground">
                  {n + 1}
                </span>
                {passo}
              </li>
            ))}
          </ol>
        </section>
        <section aria-label="Atalho do iPhone" className="cartao grid gap-3 p-4">
          <h2 className="text-[17px] leading-[22px] font-semibold">Token do Atalho</h2>
          <p className="text-[13px] leading-[18px] text-muted-foreground">
            O Atalho usa um token para lançar sem abrir o app. Gerar um novo desliga o anterior — use se perder o iPhone.
          </p>
          <Suspense fallback={null}>
            <EstadoDoToken />
          </Suspense>
        </section>
        <section aria-label="Não compartilhe" className="cartao flex items-start gap-2.5 p-4 text-alert">
          <TriangleAlert className="mt-px size-5 shrink-0" aria-hidden />
          <p className="text-sm leading-[19px] font-medium text-foreground">
            Não compartilhe o Atalho como está. Duplique, apague o token da cópia e compartilhe a cópia.
          </p>
        </section>
      </CorpoSub>
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
