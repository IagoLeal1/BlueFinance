'use client';

import { useState, useTransition } from 'react';
import { Check, Plus } from 'lucide-react';
import { criarLancamento, excluirLancamento } from '@/app/(app)/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { formatSigned, type TipoLancamento } from '@/domain/money';
import { AmountInput } from './amount-input';
import { BottomSheet } from './bottom-sheet';
import { CHIP } from './estilos';
import { useFeedback } from './feedback';
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
const SALVO: Record<TipoLancamento, string> = { despesa: 'Gasto salvo', receita: 'Receita salva', investimento: 'Aporte salvo' };

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
  const [erro, setErro] = useState<string>();
  const [, startTransition] = useTransition();
  const { adicionarPendente, removerPendente, avisar } = useFeedback();

  // Despesa e receita escolhem categoria; investimento escolhe para qual investimento vai o aporte.
  const opcoes =
    tipo === 'investimento'
      ? investimentos.map((i) => ({ valor: i.id, nome: i.nome, icone: 'piggy-bank' }))
      : categorias.filter((c) => c.tipo === tipo).map((c) => ({ valor: c.nome, nome: c.nome, icone: c.icone }));

  function desfazer(id: string) {
    startTransition(async () => {
      const form = new FormData();
      form.set('id', id);
      const r = await excluirLancamento({}, form);
      avisar({ texto: r.ok ? 'Lançamento desfeito' : 'Não foi possível desfazer.' });
    });
  }

  /**
   * Interface otimista: valida aqui, fecha o sheet e mostra a linha "salvando…" na hora;
   * o servidor confirma em seguida e o aviso oferece Desfazer.
   */
  function enviar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const escolhido = opcoes.find((o) => o.valor === categoria[0]);
    if (centavos <= 0) return setErro('Digite um valor maior que zero.');
    if (!escolhido) return setErro(tipo === 'investimento' ? 'Escolha em qual investimento foi o aporte.' : 'Escolha uma categoria.');

    const form = new FormData(evento.currentTarget);
    const descricao = String(form.get('descricao') ?? '').trim();
    const idTemporario = `pendente-${crypto.randomUUID()}`;
    const valor = centavos;
    const tipoSalvo = tipo;
    adicionarPendente({
      id: idTemporario, tipo, valor, data: new Date().toISOString(), origem: 'app',
      descricao: descricao || escolhido.nome, categoria: escolhido.nome, icone: escolhido.icone,
    });
    setAberto(false);
    setCentavos(0);
    setCategoria([]);
    setErro(undefined);

    startTransition(async () => {
      const r = await criarLancamento({}, form);
      removerPendente(idTemporario);
      if (!r.ok) return avisar({ texto: `Não salvou: ${r.erro ?? 'tente de novo.'}` });
      avisar({
        texto: `${SALVO[tipoSalvo]} · ${formatSigned(valor, tipoSalvo)}`,
        acao: r.id ? { rotulo: 'Desfazer', fazer: () => desfazer(r.id!) } : undefined,
      });
    });
  }

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
      <form onSubmit={enviar} className="grid gap-4">
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

          {erro && (
            <p role="alert" className="text-sm font-semibold text-negative">
              {erro}
            </p>
          )}

          <Button type="submit" className="w-full">
            <Check aria-hidden />
            {SALVAR[tipo]}
          </Button>
      </form>
    </BottomSheet>
  );
}
