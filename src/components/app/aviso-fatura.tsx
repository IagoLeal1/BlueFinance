'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import { Bell } from 'lucide-react';
import { ativarAvisos, desativarAvisos, enviarAvisoDeTeste } from '@/app/(app)/ajustes/actions';
import { Button } from '@/components/ui/button';

type Situacao = 'carregando' | 'instalar' | 'sem-suporte' | 'sem-chave' | 'pronto';

/** Chave pública do aviso em bytes, como o PushManager pede. */
function chavePublica(base64: string): Uint8Array<ArrayBuffer> {
  const b64 = (base64 + '='.repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/');
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}

const nadaMuda = () => () => {};
const noIphone = () => /iPhone|iPad|iPod/.test(navigator.userAgent);
const naTelaDeInicio = () =>
  window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;

/**
 * Ajustes › Aviso da fatura (design kit: TelaAvisosOffline): um dia antes e no dia do vencimento, às 9h.
 * No iPhone, só funciona com o BlueFin aberto pelo ícone da Tela de Início.
 */
export function AvisoDaFatura() {
  const chave = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  // O que o aparelho permite não muda com a página aberta: lido no cliente, "carregando" no servidor.
  const situacao = useSyncExternalStore<Situacao>(
    nadaMuda,
    () => {
      if (!chave) return 'sem-chave';
      if (noIphone() && !naTelaDeInicio()) return 'instalar';
      return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window ? 'pronto' : 'sem-suporte';
    },
    () => 'carregando',
  );
  const [inscricao, setInscricao] = useState<PushSubscription | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [mensagem, setMensagem] = useState<{ texto: string; erro?: boolean }>();

  useEffect(() => {
    if (situacao !== 'pronto') return;
    navigator.serviceWorker.ready.then((reg) => reg.pushManager.getSubscription()).then(setInscricao, () => setInscricao(null));
  }, [situacao]);

  async function alternar() {
    setOcupado(true);
    setMensagem(undefined);
    try {
      if (inscricao) {
        await desativarAvisos(inscricao.endpoint);
        await inscricao.unsubscribe();
        setInscricao(null);
      } else {
        const reg = await navigator.serviceWorker.ready;
        const nova = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: chavePublica(chave!) });
        const r = await ativarAvisos(JSON.parse(JSON.stringify(nova)));
        if (r.erro) {
          await nova.unsubscribe();
          setMensagem({ texto: r.erro, erro: true });
        } else {
          setInscricao(nova);
        }
      }
    } catch {
      setMensagem({ texto: 'O iPhone não deixou ativar. Confira em Ajustes do iPhone › Notificações › BlueFin.', erro: true });
    } finally {
      setOcupado(false);
    }
  }

  async function testar() {
    setOcupado(true);
    const r = await enviarAvisoDeTeste();
    setMensagem(r.erro ? { texto: r.erro, erro: true } : { texto: 'Enviado. Deve chegar em alguns segundos.' });
    setOcupado(false);
  }

  const ligado = !!inscricao;
  return (
    <section aria-label="Aviso da fatura" className="grid gap-3 rounded-lg bg-card p-4 shadow-card">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">Aviso da fatura</h2>
          <p className="text-[13px] leading-[18px] font-semibold text-muted-foreground">Um dia antes e no dia do vencimento, às 9h.</p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={ligado}
          aria-label="Aviso da fatura"
          disabled={situacao !== 'pronto' || ocupado}
          onClick={alternar}
          className="relative h-[31px] w-[51px] shrink-0 rounded-full bg-line-strong/40 transition-colors aria-checked:bg-primary disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <span
            aria-hidden
            className={`absolute top-0.5 left-0.5 size-[27px] rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.25)] transition-transform ${ligado ? 'translate-x-5' : ''}`}
          />
        </button>
      </div>
      {situacao === 'instalar' && (
        <p className="text-[13px] leading-[18px] font-semibold text-muted-foreground">
          Abra o BlueFin pelo ícone da Tela de Início (Safari › Compartilhar › Adicionar à Tela de Início). É só lá que o iPhone deixa um
          site mandar avisos.
        </p>
      )}
      {situacao === 'sem-chave' && (
        <p className="text-[13px] leading-[18px] font-semibold text-muted-foreground">O aviso ainda não foi configurado no servidor.</p>
      )}
      {situacao === 'sem-suporte' && (
        <p className="text-[13px] leading-[18px] font-semibold text-muted-foreground">Este navegador não recebe avisos.</p>
      )}
      {ligado && (
        <>
          <p className="text-[13px] leading-[18px] font-semibold text-positive">Ativado neste iPhone</p>
          <Button variant="ghost" className="-ml-5 justify-self-start" disabled={ocupado} onClick={testar}>
            <Bell aria-hidden />
            Enviar um aviso de teste
          </Button>
        </>
      )}
      {mensagem && (
        <p role={mensagem.erro ? 'alert' : 'status'} className={`text-sm font-semibold ${mensagem.erro ? 'text-negative' : 'text-muted-foreground'}`}>
          {mensagem.texto}
        </p>
      )}
    </section>
  );
}
