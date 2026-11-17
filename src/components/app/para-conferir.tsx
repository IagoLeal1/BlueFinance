'use client';

import { useActionState, useState } from 'react';
import { Check, Landmark, Sparkles } from 'lucide-react';
import { ignorarDoBanco, lancarDoBanco, type EstadoDoBanco } from '@/app/(app)/lancamentos/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { rotuloDoDia } from '@/domain/datas';
import { formatBRL, formatSigned } from '@/domain/money';
import { cn } from '@/lib/utils';
import type { ParaConferir as ItemDoBanco } from '@/server/banco';
import { BottomSheet } from './bottom-sheet';
import { ChipsDeCategoria, type CategoriaEditavel } from './editar-lancamento';
import { CHIP } from './estilos';
import { IconeCategoria } from './icone-categoria';
import { Privado } from './privado';

const FORMA = { debito: 'Débito', pix: 'Pix', credito: 'Crédito' } as const;

/** "Ontem · Pix", "15 nov · Crédito · 3x". */
const metaDoBanco = (t: ItemDoBanco) =>
  [rotuloDoDia(t.data).split(' · ')[0], FORMA[t.forma], ...(t.parcelas > 1 ? [`${t.parcelas}x`] : [])].join(' · ');

/**
 * Lançamentos › Para conferir (design kit: TelaOpenFinance): o que veio do banco e não bateu com nada lançado,
 * com a categoria sugerida. Lançar em um toque, Ignorar, ou tocar na linha para trocar a categoria e o "com o quê".
 */
export function ParaConferir({ itens, categorias }: { itens: ItemDoBanco[]; categorias: CategoriaEditavel[] }) {
  if (itens.length === 0) return null;
  return (
    <section aria-label="Para conferir" className="rounded-lg bg-card px-4 pt-3 pb-1 shadow-card">
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-[15px] font-extrabold">
          <Landmark className="size-[18px] text-muted-foreground" aria-hidden />
          Para conferir
        </h2>
        <span className="text-[13px] font-semibold text-muted-foreground">{itens.length} do banco</span>
      </div>
      <p className="text-[13px] leading-[18px] font-semibold text-muted-foreground">
        Vieram do banco e não batem com nada que você lançou. A categoria é uma sugestão: toque para trocar.
      </p>
      <ul>
        {itens.map((t) => (
          <LinhaDoBanco key={t.id} t={t} categorias={categorias} />
        ))}
      </ul>
    </section>
  );
}

function LinhaDoBanco({ t, categorias }: { t: ItemDoBanco; categorias: CategoriaEditavel[] }) {
  const opcoes = categorias.filter((c) => c.tipo === t.tipo);
  const [aberto, setAberto] = useState(false);
  const [categoria, setCategoria] = useState<string[]>(t.sugestao ? [t.sugestao.id] : []);
  const [descricao, setDescricao] = useState(t.nome);
  const fecharSeOk = (acao: typeof lancarDoBanco) => async (anterior: EstadoDoBanco, form: FormData) => {
    const r = await acao(anterior, form);
    if (r.ok) setAberto(false);
    return r;
  };
  const [estadoLancar, lancar, lancando] = useActionState(fecharSeOk(lancarDoBanco), {});
  const [estadoIgnorar, ignorar, ignorando] = useActionState(fecharSeOk(ignorarDoBanco), {});
  const erro = estadoLancar.erro ?? estadoIgnorar.erro;
  const escolhida = opcoes.find((c) => c.id === categoria[0]);
  const valor = (
    <span className={cn('font-bold whitespace-nowrap tabular-nums', t.tipo === 'receita' ? 'text-positive' : 'text-negative')}>
      <Privado>{formatSigned(t.valor, t.tipo)}</Privado>
    </span>
  );

  return (
    <li className="grid gap-2 py-3 not-first:border-t not-first:border-border">
      <BottomSheet
        titulo="Do banco"
        aberto={aberto}
        onAbertoChange={(v) => {
          setAberto(v);
          if (v) {
            setCategoria(t.sugestao ? [t.sugestao.id] : []);
            setDescricao(t.nome);
          }
        }}
        gatilho={
          <button type="button" className="flex w-full items-center gap-3 rounded-md text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
            <span className="min-w-0 flex-1">
              <span className="block truncate font-semibold">{t.descricao}</span>
              <span className="block text-[13px] leading-[18px] font-semibold text-muted-foreground">{metaDoBanco(t)}</span>
            </span>
            {valor}
          </button>
        }
      >
        <form action={lancar} className="grid gap-4">
          <input type="hidden" name="id" value={t.id} />
          <div className="grid gap-1 text-center">
            <p className="text-[34px] leading-10 font-extrabold tabular-nums">
              <Privado>{formatBRL(t.valor)}</Privado>
            </p>
            <p className="text-[13px] leading-[18px] font-semibold text-muted-foreground">
              {t.descricao} · {metaDoBanco(t)}
            </p>
          </div>
          <ChipsDeCategoria id={t.id} opcoes={opcoes} valor={categoria} onChange={setCategoria} />
          <div className="grid gap-2">
            <Label htmlFor={`descricao-banco-${t.id}`}>Com o quê</Label>
            <Input id={`descricao-banco-${t.id}`} name="descricao" value={descricao} onChange={(e) => setDescricao(e.target.value)} />
          </div>
          {escolhida && (
            <p className="flex gap-2 rounded-md bg-muted px-3 py-2.5 text-[13px] leading-[18px] font-semibold text-muted-foreground">
              <Sparkles className="mt-px size-4 shrink-0" aria-hidden />
              <span>
                Da próxima vez, <b className="text-foreground">{t.descricao}</b> entra sozinho em {escolhida.nome}.
              </span>
            </p>
          )}
          {erro && (
            <p role="alert" className="text-sm font-semibold text-negative">
              {erro}
            </p>
          )}
          <Button type="submit" disabled={lancando || !escolhida} className="w-full">
            <Check aria-hidden />
            Lançar
          </Button>
        </form>
        <form action={ignorar}>
          <input type="hidden" name="id" value={t.id} />
          <Button type="submit" variant="ghost" disabled={ignorando} className="w-full">
            Ignorar este
          </Button>
        </form>
      </BottomSheet>

      <div className="flex items-center gap-2">
        <button type="button" onClick={() => setAberto(true)} className={cn(CHIP, 'inline-flex h-8 min-w-0 items-center px-2.5 text-[13px]')}>
          {t.sugestao ? (
            <>
              <IconeCategoria nome={t.sugestao.icone} className="size-4" />
              <span className="truncate">{t.sugestao.nome}</span>
            </>
          ) : (
            'Escolher categoria'
          )}
        </button>
        <span className="flex-1" />
        <form action={ignorar}>
          <input type="hidden" name="id" value={t.id} />
          <Button type="submit" variant="ghost" size="sm" disabled={ignorando}>
            Ignorar
          </Button>
        </form>
        {t.sugestao ? (
          <form action={lancar}>
            <input type="hidden" name="id" value={t.id} />
            <input type="hidden" name="categoria_id" value={t.sugestao.id} />
            <input type="hidden" name="descricao" value={t.nome} />
            <Button type="submit" size="sm" disabled={lancando}>
              Lançar
            </Button>
          </form>
        ) : (
          <Button type="button" size="sm" onClick={() => setAberto(true)}>
            Lançar
          </Button>
        )}
      </div>
      {erro && !aberto && (
        <p role="alert" className="text-sm font-semibold text-negative">
          {erro}
        </p>
      )}
    </li>
  );
}
