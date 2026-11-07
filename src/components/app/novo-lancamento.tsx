'use client';

import { useActionState, useState } from 'react';
import { Check, Plus } from 'lucide-react';
import { criarLancamento, type EstadoLancamento } from '@/app/(app)/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import type { TipoLancamento } from '@/domain/money';
import { AmountInput } from './amount-input';
import { BottomSheet } from './bottom-sheet';
import { CHIP } from './estilos';
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
export interface InvestimentoOpcao {
  id: string;
  nome: string;
}

export function NovoLancamento({ categorias, investimentos }: { categorias: CategoriaOpcao[]; investimentos: InvestimentoOpcao[] }) {
  const [aberto, setAberto] = useState(false);
  const [tipo, setTipo] = useState<TipoLancamento>('despesa');
  const [centavos, setCentavos] = useState(0);
  const [categoria, setCategoria] = useState<string[]>([]);
  const [estado, acao, salvando] = useActionState(async (anterior: EstadoLancamento, form: FormData) => {
    const resultado = await criarLancamento(anterior, form);
    if (resultado.ok) {
      setAberto(false);
      setCentavos(0);
      setCategoria([]);
    }
    return resultado;
  }, {});

  // Despesa e receita escolhem categoria; investimento escolhe para qual investimento vai o aporte.
  const opcoes =
    tipo === 'investimento'
      ? investimentos.map((i) => ({ valor: i.id, nome: i.nome, icone: 'piggy-bank' }))
      : categorias.filter((c) => c.tipo === tipo).map((c) => ({ valor: c.nome, nome: c.nome, icone: c.icone }));

  return (
    <BottomSheet
      titulo="Novo lançamento"
      aberto={aberto}
      onAbertoChange={setAberto}
      gatilho={
        <button
          type="button"
          aria-label="Novo lançamento"
          className="-mt-[18px] grid size-14 place-items-center rounded-full bg-primary text-primary-foreground shadow-sheet focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <Plus className="size-7" strokeWidth={2.5} aria-hidden />
        </button>
      }
    >
      <form action={acao} className="grid gap-4">
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

          {tipo === 'investimento' && opcoes.length === 0 && (
            <p className="text-[13px] font-semibold text-muted-foreground">Cadastre um investimento na aba Investir para registrar aportes.</p>
          )}
          {opcoes.length > 0 && (
            <div className="grid gap-2">
              <Label id="rotulo-categoria">{tipo === 'investimento' ? 'Para onde' : 'Categoria'}</Label>
              <ToggleGroup
                aria-labelledby="rotulo-categoria"
                value={categoria}
                onValueChange={(v) => setCategoria(v as string[])}
                className="flex w-full flex-wrap gap-2"
              >
                {opcoes.map((c) => (
                  <ToggleGroupItem
                    key={c.valor}
                    value={c.valor}
                    className={CHIP}
                  >
                    <IconeCategoria nome={c.icone} className="size-4" />
                    {c.nome}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
              <input type="hidden" name={tipo === 'investimento' ? 'investimento_id' : 'categoria'} value={categoria[0] ?? ''} />
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
    </BottomSheet>
  );
}
