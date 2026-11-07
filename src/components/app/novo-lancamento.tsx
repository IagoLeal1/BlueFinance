'use client';

import { useActionState, useEffect, useState } from 'react';
import { Check, Plus, X } from 'lucide-react';
import { criarLancamento } from '@/app/(app)/actions';
import { Button } from '@/components/ui/button';
import { Drawer, DrawerClose, DrawerContent, DrawerTitle, DrawerTrigger } from '@/components/ui/drawer';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import type { TipoLancamento } from '@/domain/money';
import { AmountInput } from './amount-input';
import { IconeCategoria } from './icone-categoria';
import { Segmented } from './segmented';

export interface CategoriaOpcao {
  nome: string;
  tipo: 'despesa' | 'receita';
  icone: string;
}

const TIPOS: { valor: TipoLancamento; rotulo: string }[] = [
  { valor: 'despesa', rotulo: 'Despesa' },
  { valor: 'receita', rotulo: 'Receita' },
  { valor: 'investimento', rotulo: 'Investimento' },
];
const SALVAR: Record<TipoLancamento, string> = { despesa: 'Salvar gasto', receita: 'Salvar receita', investimento: 'Salvar aporte' };

/** Botão + da barra de abas e o sheet de novo lançamento (design kit: TelaNovoLancamento). */
export function NovoLancamento({ categorias }: { categorias: CategoriaOpcao[] }) {
  const [aberto, setAberto] = useState(false);
  const [tipo, setTipo] = useState<TipoLancamento>('despesa');
  const [centavos, setCentavos] = useState(0);
  const [categoria, setCategoria] = useState<string[]>([]);
  const [estado, acao, salvando] = useActionState(criarLancamento, {});

  useEffect(() => {
    if (!estado.ok) return;
    setAberto(false);
    setCentavos(0);
    setCategoria([]);
  }, [estado]);

  const opcoes = categorias.filter((c) => c.tipo === tipo);

  return (
    <Drawer open={aberto} onOpenChange={setAberto}>
      <DrawerTrigger
        render={
          <button
            type="button"
            aria-label="Novo lançamento"
            className="-mt-[18px] grid size-14 place-items-center rounded-full bg-primary text-primary-foreground shadow-sheet focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          />
        }
      >
        <Plus className="size-7" strokeWidth={2.5} aria-hidden />
      </DrawerTrigger>
      <DrawerContent className="rounded-t-xl bg-popover shadow-sheet">
        <form action={acao} className="grid gap-4 overflow-y-auto px-5 pt-2 pb-[max(env(safe-area-inset-bottom),32px)]">
          <div className="mx-auto h-[5px] w-9 rounded-full bg-border" />
          <div className="flex items-center justify-between">
            <DrawerTitle className="text-lg font-bold">Novo lançamento</DrawerTitle>
            <DrawerClose render={<Button type="button" size="icon" variant="ghost" aria-label="Fechar" />}>
              <X aria-hidden />
            </DrawerClose>
          </div>

          <Segmented
            nome="tipo"
            rotulo="Tipo"
            opcoes={TIPOS}
            valor={tipo}
            onChange={(t) => {
              setTipo(t);
              setCategoria([]);
            }}
          />

          <AmountInput nome="valor_centavos" centavos={centavos} onChange={setCentavos} />

          {opcoes.length > 0 && (
            <div className="grid gap-2">
              <Label id="rotulo-categoria">Categoria</Label>
              <ToggleGroup
                aria-labelledby="rotulo-categoria"
                value={categoria}
                onValueChange={(v) => setCategoria(v as string[])}
                className="flex w-full flex-wrap gap-2"
              >
                {opcoes.map((c) => (
                  <ToggleGroupItem
                    key={c.nome}
                    value={c.nome}
                    className="h-10 gap-1.5 rounded-full border-[1.5px] border-border bg-card px-3.5 text-sm font-semibold text-foreground hover:bg-card aria-pressed:border-primary aria-pressed:bg-secondary aria-pressed:text-secondary-foreground"
                  >
                    <IconeCategoria nome={c.icone} className="size-4" />
                    {c.nome}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
              <input type="hidden" name="categoria" value={categoria[0] ?? ''} />
            </div>
          )}

          <div className="grid gap-2">
            <Label htmlFor="descricao">Com o quê</Label>
            <Input id="descricao" name="descricao" placeholder="Ex.: Mercado do bairro" />
          </div>

          {estado.erro && (
            <p role="alert" className="text-sm font-semibold text-negative">
              {estado.erro}
            </p>
          )}

          <Button type="submit" disabled={salvando} className="w-full">
            <Check aria-hidden />
            {SALVAR[tipo]}
          </Button>
        </form>
      </DrawerContent>
    </Drawer>
  );
}
