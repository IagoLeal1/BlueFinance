import { Suspense } from 'react';
import { FeedbackProvider } from '@/components/app/feedback';
import { NovoLancamento } from '@/components/app/novo-lancamento';
import { AvisoSemInternet, ReenviarFila } from '@/components/app/sem-internet';
import { TabBar } from '@/components/app/tab-bar';
import { supabaseServidor } from '@/lib/supabase/server';
import { listarCartoes } from '@/server/cartoes';

export default function AppLayout({ children }: LayoutProps<'/'>) {
  return (
    <FeedbackProvider>
      <AvisoSemInternet />
      <ReenviarFila />
      <main className="mx-auto flex w-full max-w-[480px] flex-1 flex-col gap-3 px-4 pt-[max(env(safe-area-inset-top),16px)] pb-[100px]">
        {children}
      </main>
      <TabBar
        centro={
          <Suspense fallback={<div className="-mt-[18px] size-14 rounded-full bg-hero/40 ring-4 ring-water/40" />}>
            <BotaoNovoLancamento />
          </Suspense>
        }
      />
    </FeedbackProvider>
  );
}

async function BotaoNovoLancamento() {
  const supabase = await supabaseServidor();
  const [{ data: cats }, { data: invs }, cartoes] = await Promise.all([
    supabase.from('categorias').select('nome, tipo, icone').order('ordem'),
    supabase.from('investimentos').select('id, nome').order('nome'),
    listarCartoes(),
  ]);
  const categorias = (cats ?? []).map((c) => ({ ...c, tipo: c.tipo as 'despesa' | 'receita' }));
  return <NovoLancamento categorias={categorias} investimentos={invs ?? []} cartoes={cartoes} />;
}
