'use client';

import { useActionState } from 'react';
import { Info, Landmark } from 'lucide-react';
import { conectarBanco } from '@/app/(app)/ajustes/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { diaDe } from '@/domain/datas';
import { cn } from '@/lib/utils';
import type { BancoConectado } from '@/server/banco';

const SP = 'America/Sao_Paulo';
const formatoData = new Intl.DateTimeFormat('pt-BR', { timeZone: SP, day: 'numeric', month: 'short', year: 'numeric' });
const formatoHora = new Intl.DateTimeFormat('pt-BR', { timeZone: SP, hour: '2-digit', minute: '2-digit' });
const formatoDia = new Intl.DateTimeFormat('pt-BR', { timeZone: SP, day: 'numeric', month: 'short' });

/** "17 nov 2026". */
const dataLonga = (iso: string) => formatoData.format(new Date(iso)).replaceAll(' de ', ' ').replace('.', '');
/** "hoje, 07:12", "ontem, 07:12", "15 nov, 07:12". */
function quando(iso: string) {
  const dia = diaDe(iso);
  const hoje = diaDe(new Date());
  const ontem = diaDe(new Date(Date.now() - 86_400_000));
  const rotulo = dia === hoje ? 'hoje' : dia === ontem ? 'ontem' : formatoDia.format(new Date(iso)).replaceAll(' de ', ' ').replace('.', '');
  return `${rotulo}, ${formatoHora.format(new Date(iso))}`;
}

function Linha({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <li className="flex min-h-11 items-center justify-between gap-3 not-first:border-t not-first:border-border">
      <span className="font-semibold">{rotulo}</span>
      <span className="font-bold font-valor tabular-nums">{valor}</span>
    </li>
  );
}

function FormularioDeConexao({ deNovo }: { deNovo: boolean }) {
  const [estado, conectar, conectando] = useActionState(conectarBanco, {});
  return (
    <form action={conectar} className="grid gap-2">
      <Label htmlFor="codigo-da-conexao">Código da conexão</Label>
      <Input id="codigo-da-conexao" name="item_id" placeholder="itemId do Meu Pluggy" autoComplete="off" autoCapitalize="off" spellCheck={false} />
      {estado.erro && (
        <p role="alert" className="text-sm font-semibold text-negative">
          {estado.erro}
        </p>
      )}
      <Button type="submit" disabled={conectando} className="w-full">
        {conectando ? 'Conectando…' : deNovo ? 'Conectar de novo' : 'Conectar'}
      </Button>
    </form>
  );
}

/** Ajustes › Banco (Open Finance pelo Meu Pluggy; design kit: TelaOpenFinance). */
export function BancoAjustes({ banco }: { banco: BancoConectado | null }) {
  const ultima = banco?.atualizadoEm ?? banco?.buscadoEm ?? null;
  return (
    <section aria-label="Banco (Open Finance)" className="grid gap-3 cartao p-4">
      <h2 className="text-[17px] leading-[22px] font-semibold">Banco (Open Finance)</h2>
      {!banco ? (
        <>
          <p className="text-[13px] leading-[18px] text-muted-foreground">
            Conecte o banco pelo Meu Pluggy: uma vez por dia ele confere o que você lançou e traz o que faltou, de hoje em diante.
          </p>
          <FormularioDeConexao deNovo={false} />
        </>
      ) : (
        <>
          <div className="flex items-center gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-[12px] bg-muted text-muted-foreground">
              <Landmark className="size-5" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-bold">{banco.instituicao || 'Banco'}</p>
              <p className="text-[13px] leading-[18px] text-muted-foreground">
                {banco.contas ? `${banco.contas} · pelo Meu Pluggy` : 'pelo Meu Pluggy'}
              </p>
            </div>
            <span className={cn('text-[13px] font-bold', banco.erro ? 'text-negative' : 'text-positive')}>{banco.erro ? 'Atenção' : 'Conectado'}</span>
          </div>
          <ul>
            <Linha rotulo="Última atualização" valor={ultima ? quando(ultima) : 'ainda não'} />
            <Linha rotulo="Importa desde" valor={dataLonga(`${banco.desde}T12:00:00-03:00`)} />
            {banco.autorizacaoAte && <Linha rotulo="Autorização vale até" valor={dataLonga(banco.autorizacaoAte)} />}
          </ul>
          {banco.erro && (
            <>
              <p role="alert" className="text-sm font-semibold text-negative">
                {banco.erro}
              </p>
              <FormularioDeConexao deNovo />
            </>
          )}
          <p className="flex gap-2 rounded-md bg-muted px-3 py-2.5 text-[13px] leading-[18px] text-muted-foreground">
            <Info className="mt-px size-4 shrink-0" aria-hidden />
            <span>
              O banco atualiza uma vez por dia, sozinho. O que você lança pelo Atalho continua entrando na hora; quando o banco chega, ele confere.
            </span>
          </p>
        </>
      )}
    </section>
  );
}
