import { diaDe, somarMeses } from './datas';
import { mesDaFatura, mesesDasParcelas } from './parcelas';

/**
 * Open Finance pelo Meu Pluggy (design kit: TelaOpenFinance). Uma vez por dia o banco manda as transações da conta
 * e do cartão; cada uma é conferida com o que já foi lançado. Se bate, nada novo entra; se o estabelecimento já é
 * conhecido, entra sozinho na categoria aprendida; senão vai para "Para conferir".
 */

/** Transação como a API da Pluggy devolve (só os campos que o app usa). Valor em reais. */
export interface TransacaoPluggy {
  id: string;
  description: string;
  descriptionRaw?: string | null;
  /** Conta: negativo é saída. Cartão: positivo é compra, negativo é pagamento ou estorno. */
  amount: number;
  /** O dia, à meia-noite UTC ("2026-11-17T00:00:00.000Z"). */
  date: string;
  type: 'DEBIT' | 'CREDIT';
  status?: string | null;
  category?: string | null;
  operationType?: string | null;
  paymentData?: { paymentMethod?: string | null } | null;
  merchant?: { name?: string | null; businessName?: string | null } | null;
  creditCardMetadata?: { installmentNumber?: number | null; totalInstallments?: number | null; purchaseDate?: string | null } | null;
}

export type TipoDaConta = 'BANK' | 'CREDIT';

/** Uma transação do banco já no jeito do app: centavos, despesa ou receita, forma de pagamento e o dia. */
export interface DoBanco {
  pluggyId: string;
  conta: 'conta' | 'cartao';
  tipo: 'despesa' | 'receita';
  forma: 'debito' | 'pix' | 'credito';
  valor: number;
  /** No cartão, em quantas vezes (a 1ª parcela traz todas). */
  parcelas: number;
  /** Meio-dia do dia da transação em São Paulo ("2026-11-17T12:00:00-03:00"). */
  data: string;
  /** Como veio do banco ("PAG*ATACADAO 1234"). */
  descricao: string;
  /** Chave da categoria aprendida ("PAG*ATACADAO"). */
  estabelecimento: string;
  /** Sugestão para o "com o quê" ("Atacadao"). */
  nome: string;
  categoriaPluggy: string | null;
}

/** O que o app já registra de outro jeito: pagamento de fatura, transferência para si mesmo e investimento. */
const FICA_DE_FORA = /credit card payment|same person transfer|investment|fixed income|variable income|pension|savings/i;
const FATURA = /\b(PAGAMENTO|PGTO|PAG)\.?\s+(DE\s+|DA\s+)?FATURA/i;

const semAcento = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const titulo = (s: string) =>
  s
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((p) => p[0]!.toUpperCase() + p.slice(1))
    .join(' ');

/** A descrição em maiúsculas, sem acento, sem números e sem o que sobra no fim: a chave do estabelecimento. */
export function estabelecimentoDe(descricao: string): string {
  return semAcento(descricao)
    .toUpperCase()
    .replace(/\d+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[^A-Z]+$/, '')
    .trim();
}

/** Sugestão para o "com o quê": o nome do estabelecimento, se a Pluggy souber; senão a descrição sem prefixos. */
export function nomeDe(t: Pick<TransacaoPluggy, 'description' | 'merchant'>): string {
  if (t.merchant?.name) return titulo(t.merchant.name);
  const limpo = semAcento(t.description)
    .replace(/^(PAG|MP|EC|IFD|PG|SUMUP|STONE)\s*\*\s*/i, '')
    .replace(/^PIX(\s+(ENVIADO|RECEBIDO|TRANSF\w*|QR\s*CODE))?\s+/i, '')
    .replace(/^COMPRA(\s+NO)?(\s+(DEBITO|CARTAO))?\s+/i, '')
    .replace(/\d+/g, ' ');
  return titulo(limpo) || titulo(t.description);
}

/** Lê uma transação da Pluggy; devolve null para o que não entra no app (ver FICA_DE_FORA). */
export function lerTransacao(tipoDaConta: TipoDaConta, t: TransacaoPluggy): DoBanco | null {
  const valor = Math.round(Math.abs(t.amount) * 100);
  const descricao = (t.description || t.descriptionRaw || '').trim();
  if (!valor || !descricao) return null;
  if (t.operationType === 'PAGAMENTO_FATURA' || FICA_DE_FORA.test(t.category ?? '') || FATURA.test(descricao)) return null;
  const comum = {
    pluggyId: t.id,
    valor,
    descricao,
    estabelecimento: estabelecimentoDe(descricao),
    nome: nomeDe(t),
    categoriaPluggy: t.category ?? null,
  };
  const meioDia = (iso: string) => `${iso.slice(0, 10)}T12:00:00-03:00`;

  if (tipoDaConta === 'CREDIT') {
    // No cartão, positivo é compra; pagamento da fatura e estorno vêm negativos.
    if (t.amount <= 0) return null;
    const cc = t.creditCardMetadata;
    if ((cc?.installmentNumber ?? 1) > 1) return null;
    const parcelas = Math.min(24, Math.max(1, cc?.totalInstallments ?? 1));
    return { ...comum, conta: 'cartao', tipo: 'despesa', forma: 'credito', parcelas, data: meioDia(cc?.purchaseDate ?? t.date) };
  }
  const saiu = t.type ? t.type === 'DEBIT' : t.amount < 0;
  const pix = t.paymentData?.paymentMethod === 'PIX' || /\bPIX\b/i.test(descricao);
  return { ...comum, conta: 'conta', tipo: saiu ? 'despesa' : 'receita', forma: pix ? 'pix' : 'debito', parcelas: 1, data: meioDia(t.date) };
}

/** Lançamento do app que pode ser o mesmo da transação do banco. */
export interface Candidato {
  id: string;
  tipo: string;
  forma: string | null;
  valor: number;
  data: string;
  parcela: number | null;
  parcelas: number | null;
  recorrente: boolean;
  /** Competência ("2026-11"): na assinatura, o mês da fatura. */
  mes: string;
}

const MAX_DIAS = 3;
const diasEntre = (a: string, b: string) => Math.abs(Date.parse(`${diaDe(a)}T00:00:00Z`) - Date.parse(`${diaDe(b)}T00:00:00Z`)) / 86_400_000;

/**
 * O lançamento que é a mesma transação do banco: mesmo valor, mesma conta (débito e Pix valem igual, já que no
 * Atalho dá para escolher qualquer um), até 3 dias de diferença; o mais perto ganha. No cartão, a 1ª parcela da
 * compra no mesmo número de vezes; na assinatura, a do mês.
 */
export function acharPar(alvo: Pick<DoBanco, 'tipo' | 'forma' | 'valor' | 'parcelas' | 'data'>, candidatos: Candidato[]): string | null {
  const mes = diaDe(alvo.data).slice(0, 7);
  const distancia = (c: Candidato): number | null => {
    if (c.tipo !== alvo.tipo || c.forma === 'vr') return null;
    const d = diasEntre(c.data, alvo.data);
    if (alvo.tipo === 'receita') return c.valor === alvo.valor && d <= MAX_DIAS ? d : null;
    if (alvo.forma === 'credito') {
      if (c.forma !== 'credito') return null;
      if (c.recorrente) return alvo.parcelas === 1 && c.valor === alvo.valor && (c.mes === mes || c.mes === somarMeses(mes, 1)) ? 0 : null;
      // A divisão das parcelas põe o resto na 1ª.
      const sobra = c.valor - alvo.valor;
      return (c.parcela ?? 1) === 1 && (c.parcelas ?? 1) === alvo.parcelas && sobra >= 0 && sobra < alvo.parcelas && d <= MAX_DIAS ? d : null;
    }
    return (c.forma === 'debito' || c.forma === 'pix') && c.valor === alvo.valor && d <= MAX_DIAS ? d : null;
  };
  let melhor: { id: string; d: number } | null = null;
  for (const c of candidatos) {
    const d = distancia(c);
    if (d !== null && (!melhor || d < melhor.d)) melhor = { id: c.id, d };
  }
  return melhor?.id ?? null;
}

/** Categoria da Pluggy (em inglês) → categorias do app, na ordem de preferência. */
const PARA_O_APP: [RegExp, string[]][] = [
  [/groceries|supermarket/i, ['Mercado']],
  [/eating out|restaurant|food|bakery|coffee|bars\b/i, ['Alimentação', 'Comer fora']],
  [/taxi|ride|transport|gas station|fuel|parking|toll|vehicle|automotive/i, ['Transporte']],
  [/pharma|drugstore|health|hospital|clinic|doctor|dentist|gym|fitness|wellness/i, ['Saúde']],
  [/rent|housing|electricity|water|utilities|internet|telecom|condo|home/i, ['Moradia']],
  [/leisure|entertainment|streaming|tickets|travel|gaming|games|cinema|music|culture|hotel|lodging|airline/i, ['Lazer']],
];

/** Sugestão de categoria para quem vai conferir. Gasto sem par vai em Outros; receita só sugere Salário. */
export function categoriaSugerida(categoriaPluggy: string | null, tipo: 'despesa' | 'receita', nomes: string[]): string | null {
  const existe = (lista: string[]) => lista.find((n) => nomes.includes(n)) ?? null;
  if (tipo === 'receita') return /salary|payroll|wage/i.test(categoriaPluggy ?? '') ? existe(['Salário']) : null;
  for (const [padrao, lista] of PARA_O_APP) if (categoriaPluggy && padrao.test(categoriaPluggy)) return existe(lista) ?? existe(['Outros']);
  return existe(['Outros']);
}

/** Cartão do app para uma compra do cartão do banco: o de nome parecido; senão o primeiro. */
export function escolherCartao<C extends { nome: string }>(cartoes: C[], nomeDaConta: string): C | null {
  const chave = (s: string) => semAcento(s).replace(/[^a-z0-9]/gi, '').toLowerCase();
  const conta = chave(nomeDaConta);
  return cartoes.find((c) => chave(c.nome) && conta.includes(chave(c.nome))) ?? cartoes[0] ?? null;
}

export interface LinhaDoBanco {
  user_id: string;
  tipo: 'despesa' | 'receita';
  valor: number;
  categoria_id: string;
  descricao: string;
  data: string;
  origem: 'banco';
  forma_pagamento: 'debito' | 'pix' | 'credito' | null;
  cartao_id?: string;
  compra_id?: string;
  parcela?: number;
  parcelas?: number;
  competencia?: string;
}

/**
 * O lançamento criado a partir do banco (origem "banco"). No cartão, todas as parcelas, cada uma na fatura dela,
 * como uma compra feita no app.
 */
export function linhasDoLancamento(
  t: Pick<DoBanco, 'tipo' | 'forma' | 'valor' | 'parcelas' | 'data'>,
  o: { userId: string; categoriaId: string; descricao: string; compraId: string; cartao: { id: string; diaFechamento: number } | null },
): LinhaDoBanco[] {
  const base: LinhaDoBanco = {
    user_id: o.userId,
    tipo: t.tipo,
    valor: t.valor,
    categoria_id: o.categoriaId,
    descricao: o.descricao,
    data: t.data,
    origem: 'banco',
    forma_pagamento: t.tipo === 'receita' ? null : t.forma,
  };
  if (t.tipo === 'receita' || t.forma !== 'credito') return [base];
  if (!o.cartao) throw new Error('Cadastre o cartão em Ajustes para lançar compras no crédito.');
  const cartao = o.cartao;
  return mesesDasParcelas(mesDaFatura(t.data, cartao.diaFechamento), t.parcelas).map((competencia, i) => ({
    ...base,
    cartao_id: cartao.id,
    compra_id: o.compraId,
    parcela: i + 1,
    parcelas: t.parcelas,
    competencia,
  }));
}
