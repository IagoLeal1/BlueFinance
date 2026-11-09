'use client';

import { useState, useTransition } from 'react';
import { Check, Plus } from 'lucide-react';
import { criarLancamento, excluirCompra, excluirLancamento } from '@/app/(app)/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { formatSigned, type TipoLancamento } from '@/domain/money';
import type { Cartao } from '@/server/cartoes';
import { AmountInput } from './amount-input';
import { BottomSheet } from './bottom-sheet';
import { CHAVE_CARTAO, CamposCredito, FORMAS, cartaoInicial, rotuloParcelas, type Forma } from './campos-credito';
import { CHIP } from './estilos';
import { guardarNaFila, tirarDaFila } from './fila-offline';
import { useFeedback } from './feedback';
import { IconeCategoria } from './icone-categoria';
import { NotaAporte } from './nota-aporte';
import { Segmented } from './segmented';

export interface CategoriaOpcao {
  nome: string;
  tipo: 'despesa' | 'receita';
  icone: string;
  ordem: number;
}

const TIPOS: { valor: TipoLancamento; rotulo: string }[] = [
  { valor: 'despesa', rotulo: 'Despesa' },
  { valor: 'receita', rotulo: 'Receita' },
  { valor: 'investimento', rotulo: 'Investimento' },
];
const SALVAR: Record<TipoLancamento, string> = { despesa: 'Salvar gasto', receita: 'Salvar receita', investimento: 'Salvar aporte' };
const SALVO: Record<TipoLancamento, string> = { despesa: 'Gasto salvo', receita: 'Receita salva', investimento: 'Aporte salvo' };

// Última categoria usada por tipo, guardada no aparelho: o + já abre com ela marcada.
const chaveUltima = (tipo: TipoLancamento) => `bf:ultima-categoria:${tipo}`;
const lerUltima = (tipo: TipoLancamento) => (typeof localStorage === 'undefined' ? null : localStorage.getItem(chaveUltima(tipo)));

/** Botão + da barra de abas e o sheet de novo lançamento (design kit: TelaNovoLancamento). */
export interface InvestimentoOpcao {
  id: string;
  nome: string;
  instituicao: string;
  /** Rende a esse % do CDI (null: "Não calcular"). */
  percentual_cdi: number | null;
}

export function NovoLancamento({
  categorias,
  investimentos,
  cartoes,
}: {
  categorias: CategoriaOpcao[];
  investimentos: InvestimentoOpcao[];
  cartoes: Cartao[];
}) {
  const [aberto, setAberto] = useState(false);
  const [tipo, setTipo] = useState<TipoLancamento>('despesa');
  const [centavos, setCentavos] = useState(0);
  const [categoria, setCategoria] = useState<string[]>([]);
  const [forma, setForma] = useState<Forma>('debito');
  const [cartaoId, setCartaoId] = useState<string[]>([]);
  const [parcelas, setParcelas] = useState(1);
  const [todoMes, setTodoMes] = useState(false);
  const noCredito = tipo === 'despesa' && forma === 'credito';
  const cartao = cartoes.find((c) => c.id === cartaoId[0]);
  const [erro, setErro] = useState<string>();
  const [, startTransition] = useTransition();
  const { adicionarPendente, removerPendente, avisar } = useFeedback();

  // Despesa e receita escolhem categoria; investimento escolhe para qual investimento vai o aporte.
  const opcoesDe = (t: TipoLancamento) =>
    t === 'investimento'
      ? investimentos.map((i) => ({ valor: i.id, nome: i.nome, icone: 'piggy-bank', ordem: 0 }))
      : categorias.filter((c) => c.tipo === t).map((c) => ({ valor: c.nome, nome: c.nome, icone: c.icone, ordem: c.ordem }));
  const opcoes = opcoesDe(tipo);
  const aporteNoCdi = investimentos.find((i) => i.id === categoria[0] && i.percentual_cdi !== null);

  const ultimaDe = (t: TipoLancamento, lista = opcoesDe(t)) => {
    const ultima = lerUltima(t);
    return ultima && lista.some((o) => o.valor === ultima) ? [ultima] : [];
  };

  function desfazer(campo: 'id' | 'compra_id', id: string) {
    startTransition(async () => {
      const form = new FormData();
      form.set(campo, id);
      const r = await (campo === 'id' ? excluirLancamento : excluirCompra)({}, form);
      avisar({ texto: r.ok ? 'Lançamento desfeito' : 'Não foi possível desfazer.' });
    });
  }

  function limpar() {
    setCentavos(0);
    setCategoria([]);
    setForma('debito');
    setParcelas(1);
    setTodoMes(false);
    setErro(undefined);
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
    if (noCredito && !cartao) return setErro('Escolha o cartão.');
    if (noCredito && centavos < parcelas) return setErro('O valor é pequeno demais para tantas parcelas.');

    const form = new FormData(evento.currentTarget);
    // Id gerado aqui: vai para a fila do aparelho até o servidor confirmar; reenviar não duplica.
    const id = crypto.randomUUID();
    form.set('id', id);
    const campos = [...form.entries()].map(([nome, v]) => [nome, String(v)] as [string, string]);
    const descricao = String(form.get('descricao') ?? '').trim();
    const valor = centavos;
    const tipoSalvo = tipo;
    localStorage.setItem(chaveUltima(tipo), escolhido.valor);

    if (noCredito) {
      // No crédito as parcelas podem cair em outros meses: sem linha "salvando…" aqui, só o aviso.
      localStorage.setItem(CHAVE_CARTAO, cartao!.id);
      const aviso = todoMes
        ? `Assinatura salva · ${formatSigned(valor, 'despesa')} por mês`
        : parcelas > 1
          ? `Compra salva · ${rotuloParcelas(valor, parcelas)}`
          : `${SALVO.despesa} · ${formatSigned(valor, 'despesa')}`;
      guardarNaFila({ id, campos, aviso });
      setAberto(false);
      limpar();
      startTransition(async () => {
        const r = await criarLancamento({}, form);
        tirarDaFila(id);
        if (!r.ok) return avisar({ texto: `Não salvou: ${r.erro ?? 'tente de novo.'}` });
        avisar({ texto: aviso, acao: r.compraId ? { rotulo: 'Desfazer', fazer: () => desfazer('compra_id', r.compraId!) } : undefined });
      });
      return;
    }

    const pendente = {
      id, tipo, valor, data: new Date().toISOString(), origem: 'app' as const,
      descricao: descricao || escolhido.nome, categoria: escolhido.nome, icone: escolhido.icone,
      ordemCategoria: escolhido.ordem || null,
      forma: tipo === 'despesa' ? forma : null, cartao: null, compraId: null, parcela: null, parcelas: null, totalDaCompra: null, recorrente: false,
    };
    const aviso = `${SALVO[tipoSalvo]} · ${formatSigned(valor, tipoSalvo)}`;
    guardarNaFila({ id, campos, pendente, aviso });
    adicionarPendente(pendente);
    setAberto(false);
    limpar();

    startTransition(async () => {
      // Sem internet, a ação fica pendente (useOffline) e é refeita quando a conexão volta.
      const r = await criarLancamento({}, form);
      tirarDaFila(id);
      removerPendente(id);
      if (!r.ok) return avisar({ texto: `Não salvou: ${r.erro ?? 'tente de novo.'}` });
      avisar({ texto: aviso, acao: r.id ? { rotulo: 'Desfazer', fazer: () => desfazer('id', r.id!) } : undefined });
    });
  }

  return (
    <BottomSheet
      titulo="Novo lançamento"
      aberto={aberto}
      onAbertoChange={(v) => {
        setAberto(v);
        if (v) setCategoria(ultimaDe(tipo));
      }}
      gatilho={
        <button
          type="button"
          aria-label="Novo lançamento"
          className="-mt-[18px] grid size-14 place-items-center rounded-full bg-hero text-on-hero shadow-sheet ring-4 ring-water focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
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
              setCategoria(ultimaDe(t));
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
          {tipo === 'investimento' && aporteNoCdi && (
            <NotaAporte nome={aporteNoCdi.nome} instituicao={aporteNoCdi.instituicao} percentual={aporteNoCdi.percentual_cdi!} />
          )}

          {tipo === 'despesa' && (
            <div className="grid gap-2">
              <Label id="rotulo-forma">Como pagou</Label>
              <Segmented
                nome="forma"
                rotulo="Como pagou"
                opcoes={FORMAS}
                valor={forma}
                onChange={(f) => {
                  setForma(f);
                  if (f === 'credito' && !cartao) setCartaoId(cartaoInicial(cartoes));
                }}
              />
            </div>
          )}

          {noCredito && (
            <CamposCredito
              id="novo"
              cartoes={cartoes}
              cartaoId={cartaoId}
              onCartao={setCartaoId}
              parcelas={parcelas}
              onParcelas={setParcelas}
              centavos={centavos}
              dataCompra={new Date().toISOString()}
              todoMes={todoMes}
              onTodoMes={setTodoMes}
              onIrAjustes={() => setAberto(false)}
            />
          )}

          <div className="grid gap-2">
            <Label htmlFor="descricao">Com o quê (opcional)</Label>
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
