'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { CalendarDays, Check, CreditCard, Plus } from 'lucide-react';
import { criarLancamento, excluirCompra, excluirLancamento } from '@/app/(app)/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { diaDe, nomeDoMes } from '@/domain/datas';
import { formatBRL, formatSigned, type TipoLancamento } from '@/domain/money';
import { mesDaFatura, mesesDasParcelas } from '@/domain/parcelas';
import type { Cartao } from '@/server/cartoes';
import { AmountInput } from './amount-input';
import { BottomSheet } from './bottom-sheet';
import { CHIP } from './estilos';
import { useFeedback } from './feedback';
import { IconeCategoria } from './icone-categoria';
import { Segmented } from './segmented';
import { Stepper } from './stepper';

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

type Forma = 'debito' | 'pix' | 'credito';
const FORMAS: { valor: Forma; rotulo: string }[] = [
  { valor: 'debito', rotulo: 'Débito' },
  { valor: 'pix', rotulo: 'Pix' },
  { valor: 'credito', rotulo: 'Crédito' },
];
const CHAVE_CARTAO = 'bf:ultimo-cartao';

/** "3x de R$ 400,00" — o valor de cada parcela (os centavos que sobram vão na 1ª). */
const rotuloParcelas = (total: number, n: number) => `${n}x de ${formatBRL(Math.floor(total / n))}`;

/** Em qual fatura cai a compra feita hoje e, se parcelada, em qual mês termina. */
function NotaFatura({ cartao, parcelas }: { cartao: Cartao; parcelas: number }) {
  const hoje = new Date().toISOString();
  const meses = mesesDasParcelas(mesDaFatura(hoje, cartao.diaFechamento), parcelas);
  const dia = Number(diaDe(hoje).slice(8));
  const porque = `(o ${cartao.nome} fecha dia ${cartao.diaFechamento}; hoje é ${dia})`;
  return (
    <p className="flex gap-2 rounded-md bg-muted px-3 py-2.5 text-[13px] leading-[18px] font-semibold text-muted-foreground">
      <CalendarDays className="mt-px size-4 shrink-0" aria-hidden />
      {parcelas > 1 ? (
        <span>
          1ª parcela na fatura de <b className="text-foreground">{nomeDoMes(meses[0]!)}</b> {porque}. Última em{' '}
          {nomeDoMes(meses.at(-1)!)}.
        </span>
      ) : (
        <span>
          Cai na fatura de <b className="text-foreground">{nomeDoMes(meses[0]!)}</b> {porque}.
        </span>
      )}
    </p>
  );
}

// Última categoria usada por tipo, guardada no aparelho: o + já abre com ela marcada.
const chaveUltima = (tipo: TipoLancamento) => `bf:ultima-categoria:${tipo}`;
const lerUltima = (tipo: TipoLancamento) => (typeof localStorage === 'undefined' ? null : localStorage.getItem(chaveUltima(tipo)));

/** Botão + da barra de abas e o sheet de novo lançamento (design kit: TelaNovoLancamento). */
export interface InvestimentoOpcao {
  id: string;
  nome: string;
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
  const noCredito = tipo === 'despesa' && forma === 'credito';
  const cartao = cartoes.find((c) => c.id === cartaoId[0]);
  const [erro, setErro] = useState<string>();
  const [, startTransition] = useTransition();
  const { adicionarPendente, removerPendente, avisar } = useFeedback();

  // Despesa e receita escolhem categoria; investimento escolhe para qual investimento vai o aporte.
  const opcoesDe = (t: TipoLancamento) =>
    t === 'investimento'
      ? investimentos.map((i) => ({ valor: i.id, nome: i.nome, icone: 'piggy-bank' }))
      : categorias.filter((c) => c.tipo === t).map((c) => ({ valor: c.nome, nome: c.nome, icone: c.icone }));
  const opcoes = opcoesDe(tipo);

  const ultimaDe = (t: TipoLancamento, lista = opcoesDe(t)) => {
    const ultima = lerUltima(t);
    return ultima && lista.some((o) => o.valor === ultima) ? [ultima] : [];
  };

  // Cartão já marcado ao escolher Crédito: o último usado, senão o primeiro cadastrado.
  const cartaoInicial = () => {
    const ultimo = typeof localStorage === 'undefined' ? null : localStorage.getItem(CHAVE_CARTAO);
    const c = cartoes.find((x) => x.id === ultimo) ?? cartoes[0];
    return c ? [c.id] : [];
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
    const descricao = String(form.get('descricao') ?? '').trim();
    const valor = centavos;
    const tipoSalvo = tipo;
    localStorage.setItem(chaveUltima(tipo), escolhido.valor);

    if (noCredito) {
      // No crédito as parcelas podem cair em outros meses: sem linha "salvando…" aqui, só o aviso.
      localStorage.setItem(CHAVE_CARTAO, cartao!.id);
      const n = parcelas;
      setAberto(false);
      limpar();
      startTransition(async () => {
        const r = await criarLancamento({}, form);
        if (!r.ok) return avisar({ texto: `Não salvou: ${r.erro ?? 'tente de novo.'}` });
        avisar({
          texto: n > 1 ? `Compra salva · ${rotuloParcelas(valor, n)}` : `${SALVO.despesa} · ${formatSigned(valor, 'despesa')}`,
          acao: r.compraId ? { rotulo: 'Desfazer', fazer: () => desfazer('compra_id', r.compraId!) } : undefined,
        });
      });
      return;
    }

    const idTemporario = `pendente-${crypto.randomUUID()}`;
    adicionarPendente({
      id: idTemporario, tipo, valor, data: new Date().toISOString(), origem: 'app',
      descricao: descricao || escolhido.nome, categoria: escolhido.nome, icone: escolhido.icone,
      forma: tipo === 'despesa' ? forma : null, cartao: null, compraId: null, parcela: null, parcelas: null, totalDaCompra: null,
    });
    setAberto(false);
    limpar();

    startTransition(async () => {
      const r = await criarLancamento({}, form);
      removerPendente(idTemporario);
      if (!r.ok) return avisar({ texto: `Não salvou: ${r.erro ?? 'tente de novo.'}` });
      avisar({
        texto: `${SALVO[tipoSalvo]} · ${formatSigned(valor, tipoSalvo)}`,
        acao: r.id ? { rotulo: 'Desfazer', fazer: () => desfazer('id', r.id!) } : undefined,
      });
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
                  if (f === 'credito' && !cartao) setCartaoId(cartaoInicial());
                }}
              />
            </div>
          )}

          {noCredito && cartoes.length === 0 && (
            <p className="text-[13px] font-semibold text-muted-foreground">
              Cadastre seu cartão em{' '}
              <Link href="/ajustes" className="text-primary underline" onClick={() => setAberto(false)}>
                Ajustes
              </Link>{' '}
              para lançar no crédito.
            </p>
          )}
          {noCredito && cartoes.length > 0 && (
            <>
              <div className="grid gap-2">
                <Label id="rotulo-cartao">Cartão</Label>
                <ToggleGroup
                  aria-labelledby="rotulo-cartao"
                  value={cartaoId}
                  onValueChange={(v) => (v as string[]).length > 0 && setCartaoId(v as string[])}
                  className="flex w-full flex-wrap gap-2"
                >
                  {cartoes.map((c) => (
                    <ToggleGroupItem key={c.id} value={c.id} className={CHIP}>
                      <CreditCard className="size-4" aria-hidden />
                      {c.nome}
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
                <input type="hidden" name="cartao_id" value={cartaoId[0] ?? ''} />
              </div>
              <div className="grid gap-2">
                <Label>Parcelas</Label>
                <Stepper valor={parcelas} min={1} max={24} onChange={setParcelas} rotulo={(n) => rotuloParcelas(centavos, n)} />
                <input type="hidden" name="parcelas" value={parcelas} />
              </div>
              {cartao && <NotaFatura cartao={cartao} parcelas={parcelas} />}
            </>
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
