import type { Metadata } from 'next';
import { Suspense } from 'react';
import { CreditCard, Landmark, Nfc, UtensilsCrossed, Zap } from 'lucide-react';
import { AvisoDaFatura } from '@/components/app/aviso-fatura';
import { BotaoSair } from '@/components/app/botao-sair';
import { CabecaTela } from '@/components/app/cabeca-tela';
import { GrupoAjustes, LinhaAjuste } from '@/components/app/linha-ajuste';
import { BARBATANA } from '@/components/app/marca';
import { formatReais } from '@/domain/money';
import { supabaseServidor } from '@/lib/supabase/server';
import { cartoesDaCarteira } from '@/server/apple-pay';
import { bancoDoUsuario } from '@/server/banco';
import { listarCartoes } from '@/server/cartoes';
import { tokenAtivo } from '@/server/tokens';
import { vrDoUsuario } from '@/server/vr';
import { sair } from './actions';

export const metadata: Metadata = { title: 'Ajustes · BlueFinance' };

const hora = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

/** Ajustes (design-preview: tela de Ajustes): a lista agrupada; cada linha abre a sua subtela. */
export default function Ajustes() {
  return (
    <>
      <CabecaTela titulo="Ajustes" />
      <GrupoAjustes>
        <LinhaAjuste href="/ajustes/cartoes" Icone={CreditCard} titulo="Cartões">
          <Estado>
            <EstadoCartoes />
          </Estado>
        </LinhaAjuste>
        <LinhaAjuste href="/ajustes/vale-refeicao" Icone={UtensilsCrossed} titulo="Vale-refeição">
          <Estado>
            <EstadoVr />
          </Estado>
        </LinhaAjuste>
      </GrupoAjustes>
      <GrupoAjustes rotulo="Lançar sozinho">
        <LinhaAjuste href="/ajustes/banco" Icone={Landmark} titulo="Banco">
          <Estado>
            <EstadoBanco />
          </Estado>
        </LinhaAjuste>
        <LinhaAjuste href="/ajustes/apple-pay" Icone={Nfc} titulo="Apple Pay">
          <Estado>
            <EstadoApplePay />
          </Estado>
        </LinhaAjuste>
        <LinhaAjuste href="/ajustes/atalho" Icone={Zap} titulo="Atalho do iPhone">
          <Estado>
            <EstadoAtalho />
          </Estado>
        </LinhaAjuste>
      </GrupoAjustes>
      <h2 className="mx-4 -mb-2 text-[13px] leading-[18px] font-semibold text-muted-foreground">Neste iPhone</h2>
      <AvisoDaFatura />
      <section aria-label="Conta" className="cartao grid gap-1 p-4">
        <p className="text-[13px] leading-[18px] text-muted-foreground">Conta</p>
        <Suspense fallback={null}>
          <EmailDaConta />
        </Suspense>
        <form action={sair}>
          <BotaoSair />
        </form>
      </section>
      <p className="grid justify-items-center gap-0.5 pt-3 pb-1 text-[13px] text-muted-foreground">
        <svg viewBox="26 30 126 88" className="h-5 w-[22px] fill-primary" aria-hidden>
          <path d={BARBATANA} />
        </svg>
        BlueFin
      </p>
    </>
  );
}

function Estado({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<span className="invisible">…</span>}>{children}</Suspense>;
}

async function EstadoCartoes() {
  const cartoes = await listarCartoes();
  const [primeiro] = cartoes;
  if (!primeiro) return 'Nenhum cartão';
  const resto = cartoes.length > 1 ? ` e mais ${cartoes.length - 1}` : '';
  return `${primeiro.nome}, fecha dia ${primeiro.diaFechamento} e vence dia ${primeiro.diaVencimento}${resto}`;
}

async function EstadoVr() {
  const vr = await vrDoUsuario();
  return vr ? `${formatReais(vr.valorMensal)} todo dia ${vr.dia}` : 'Não configurado';
}

async function EstadoBanco() {
  const banco = await bancoDoUsuario();
  if (!banco) return 'Não conectado';
  if (banco.erro) return 'Precisa de atenção';
  return banco.buscadoEm ? `Conectado, buscou ${hora.format(new Date(banco.buscadoEm))}` : 'Conectado';
}

async function EstadoApplePay() {
  const n = (await cartoesDaCarteira()).length;
  return n === 0 ? 'Nenhum cartão ainda' : n === 1 ? '1 cartão da Carteira' : `${n} cartões da Carteira`;
}

async function EstadoAtalho() {
  const supabase = await supabaseServidor();
  const { data } = await supabase.auth.getClaims();
  const ativo = data?.claims.sub ? await tokenAtivo(data.claims.sub) : null;
  return ativo ? 'Token ativo' : 'Sem token';
}

async function EmailDaConta() {
  const supabase = await supabaseServidor();
  const { data } = await supabase.auth.getClaims();
  return <p className="font-semibold">{data?.claims.email ?? ''}</p>;
}
