import 'server-only';
import { randomUUID } from 'node:crypto';
import {
  acharPar,
  categoriaSugerida,
  escolherCartao,
  lerTransacao,
  linhasDoLancamento,
  type Candidato,
  type DoBanco,
  type TipoDaConta,
  type TransacaoPluggy,
} from '@/domain/banco';
import { diaDe } from '@/domain/datas';
import { supabaseServidor } from '@/lib/supabase/server';
import { supabaseAdmin } from './supabase-admin';

/**
 * Open Finance pelo Meu Pluggy (design kit: TelaOpenFinance; regras em src/domain/banco.ts). A busca roda uma vez
 * por dia (agendamento da Vercel, /api/banco), ao conectar em Ajustes e, sem segurar a tela, ao abrir Lançamentos
 * quando a última busca tem mais de algumas horas.
 */

/** Problema que aparece para você em Ajustes › Banco. */
class ErroDoBanco extends Error {}

const SEM_CONEXAO = 'Não achei a conexão na Pluggy. Conecte de novo em Ajustes.';
const AUTORIZACAO = 'A autorização do banco venceu ou foi revogada. Renove no Meu Pluggy.';

interface ItemPluggy {
  id: string;
  status?: string | null;
  lastUpdatedAt?: string | null;
  consentExpiresAt?: string | null;
  connector?: { name?: string | null } | null;
}
interface ContaPluggy {
  id: string;
  type: TipoDaConta;
  name: string;
  marketingName?: string | null;
}

const urlDaPluggy = () => process.env.PLUGGY_URL || 'https://api.pluggy.ai';

/** Chave de acesso da Pluggy (vale 2 horas), a partir do Client ID e do Client Secret do app na Pluggy. */
async function chaveDaPluggy(): Promise<string> {
  const clientId = process.env.PLUGGY_CLIENT_ID;
  const clientSecret = process.env.PLUGGY_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new ErroDoBanco('Falta a chave da Pluggy na Vercel (PLUGGY_CLIENT_ID e PLUGGY_CLIENT_SECRET).');
  const res = await fetch(`${urlDaPluggy()}/auth`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ clientId, clientSecret }),
    cache: 'no-store',
  });
  if (!res.ok) throw new ErroDoBanco('A Pluggy recusou a chave do app. Confira PLUGGY_CLIENT_ID e PLUGGY_CLIENT_SECRET na Vercel.');
  return ((await res.json()) as { apiKey: string }).apiKey;
}

/** GET na API da Pluggy; null quando não existe (404). */
async function pedir<T>(chave: string, caminho: string): Promise<T | null> {
  const res = await fetch(`${urlDaPluggy()}${caminho}`, { headers: { 'X-API-KEY': chave }, cache: 'no-store' });
  if (res.status === 404 || res.status === 400) return null;
  if (!res.ok) throw new Error(`Pluggy ${caminho.split('?')[0]}: ${res.status}`);
  return (await res.json()) as T;
}

export interface Conexao {
  instituicao: string;
  /** "Conta e cartão", "Conta" ou "Cartão". */
  contas: string;
  atualizadoEm: string | null;
  autorizacaoAte: string | null;
  /** Problema da conexão (autorização vencida); null se está tudo certo. */
  erro: string | null;
  listaDeContas: ContaPluggy[];
}

/** O item da Pluggy (a conexão) e as contas dele. */
async function lerConexao(chave: string, itemId: string, agora: Date): Promise<Conexao> {
  const item = await pedir<ItemPluggy>(chave, `/items/${encodeURIComponent(itemId)}`);
  if (!item) throw new ErroDoBanco(SEM_CONEXAO);
  const contas = (await pedir<{ results: ContaPluggy[] }>(chave, `/accounts?itemId=${encodeURIComponent(itemId)}`))?.results ?? [];
  const conta = contas.find((c) => c.type === 'BANK') ?? contas[0];
  // Pelo Meu Pluggy, o conector é o próprio Meu Pluggy: o nome do banco vem da conta.
  const conector = item.connector?.name ?? '';
  const instituicao = conector && !/pluggy/i.test(conector) ? conector : (conta?.marketingName || conta?.name || conector);
  const temConta = contas.some((c) => c.type === 'BANK');
  const temCartao = contas.some((c) => c.type === 'CREDIT');
  const vencida = item.consentExpiresAt ? Date.parse(item.consentExpiresAt) < agora.getTime() : false;
  return {
    instituicao,
    contas: temConta && temCartao ? 'Conta e cartão' : temConta ? 'Conta' : temCartao ? 'Cartão' : '',
    atualizadoEm: item.lastUpdatedAt ?? null,
    autorizacaoAte: item.consentExpiresAt ?? null,
    erro: vencida || item.status === 'LOGIN_ERROR' || item.status === 'OUTDATED' ? AUTORIZACAO : null,
    listaDeContas: contas,
  };
}

/** Todas as transações da conta desde o dia `desde`, seguindo o cursor (GET /v2/transactions). */
async function transacoesDa(chave: string, contaId: string, desde: string): Promise<TransacaoPluggy[]> {
  const todas: TransacaoPluggy[] = [];
  let caminho: string | null = `/v2/transactions?accountId=${encodeURIComponent(contaId)}&dateFrom=${desde}`;
  for (let pagina = 0; caminho && pagina < 100; pagina++) {
    const resposta: { results: TransacaoPluggy[]; next: string | null } | null = await pedir(chave, caminho);
    todas.push(...(resposta?.results ?? []));
    caminho = resposta?.next ? `/v2/transactions${resposta.next}` : null;
  }
  return todas;
}

export interface ResumoDaBusca {
  conexoes: number;
  novas: number;
  conferidas: number;
  lancadas: number;
  paraConferir: number;
  erros: number;
}

/**
 * Busca no banco de quem conectou (ou só de `userId`) e confere cada transação nova: bate com um lançamento →
 * "conferido"; estabelecimento conhecido → vira lançamento sozinho; senão → "Para conferir", com a categoria
 * sugerida. O que estava para conferir e foi lançado depois (pelo Atalho, por exemplo) também vira "conferido".
 */
export async function sincronizarBanco({ userId, agora = new Date() }: { userId?: string; agora?: Date } = {}): Promise<ResumoDaBusca> {
  const resumo: ResumoDaBusca = { conexoes: 0, novas: 0, conferidas: 0, lancadas: 0, paraConferir: 0, erros: 0 };
  let consulta = supabaseAdmin.from('bancos').select('user_id, item_id, desde');
  if (userId) consulta = consulta.eq('user_id', userId);
  const { data: bancos, error } = await consulta;
  if (error) throw error;
  if (bancos.length === 0) return resumo;

  const anotarErro = async (ids: string[], e: unknown) => {
    if (!(e instanceof ErroDoBanco)) console.error('Busca no banco:', e);
    const erro = e instanceof ErroDoBanco ? e.message : 'Não deu para buscar no banco agora. Tento de novo mais tarde.';
    await supabaseAdmin.from('bancos').update({ erro, buscado_em: agora.toISOString() }).in('user_id', ids);
    resumo.erros += ids.length;
  };
  let chave: string;
  try {
    chave = await chaveDaPluggy();
  } catch (e) {
    await anotarErro(
      bancos.map((b) => b.user_id),
      e,
    );
    return resumo;
  }
  for (const banco of bancos) {
    resumo.conexoes++;
    try {
      const r = await sincronizarUm(chave, banco, agora);
      resumo.novas += r.novas;
      resumo.conferidas += r.conferidas;
      resumo.lancadas += r.lancadas;
      resumo.paraConferir += r.paraConferir;
    } catch (e) {
      await anotarErro([banco.user_id], e);
    }
  }
  return resumo;
}

type Lida = DoBanco & { nomeDaConta: string };

async function sincronizarUm(chave: string, banco: { user_id: string; item_id: string; desde: string }, agora: Date) {
  const db = supabaseAdmin;
  const u = banco.user_id;
  const conexao = await lerConexao(chave, banco.item_id, agora);
  const lidas: Lida[] = [];
  for (const conta of conexao.listaDeContas) {
    for (const t of await transacoesDa(chave, conta.id, banco.desde)) {
      const lida = lerTransacao(conta.type, t);
      // Daqui para frente: o que é de antes da conexão fica como estava no app.
      if (lida && diaDe(lida.data) >= banco.desde) lidas.push({ ...lida, nomeDaConta: conta.marketingName || conta.name });
    }
  }

  // Lançamentos de alguns dias antes da conexão em diante (e as assinaturas, que repetem a data da 1ª).
  const folga = new Date(Date.parse(`${banco.desde}T00:00:00-03:00`) - 4 * 86_400_000).toISOString();
  const [jaVieram, lancamentos, regras, categorias, cartoes] = await Promise.all([
    db.from('transacoes_banco').select('id, pluggy_id, situacao, lancamento_id, tipo, forma, valor, parcelas, data').eq('user_id', u),
    db
      .from('lancamentos')
      .select('id, tipo, forma_pagamento, valor, data, parcela, parcelas, recorrente, competencia')
      .eq('user_id', u)
      .or(`data.gte.${folga},recorrente.eq.true`),
    db.from('regras_banco').select('tipo, estabelecimento, categoria_id, descricao').eq('user_id', u),
    db.from('categorias').select('id, nome, tipo').eq('user_id', u),
    db.from('cartoes').select('id, nome, dia_fechamento').eq('user_id', u).order('criado_em'),
  ]);
  for (const r of [jaVieram, lancamentos, regras, categorias, cartoes]) if (r.error) throw r.error;

  const usados = new Set(jaVieram.data!.flatMap((t) => (t.lancamento_id ? [t.lancamento_id] : [])));
  const todos: Candidato[] = lancamentos.data!.map((l) => ({
    id: l.id,
    tipo: l.tipo,
    forma: l.forma_pagamento,
    valor: l.valor,
    data: l.data,
    parcela: l.parcela,
    parcelas: l.parcelas,
    recorrente: l.recorrente,
    mes: l.competencia,
  }));
  const parDe = (t: Parameters<typeof acharPar>[0]) => {
    const id = acharPar(
      t,
      todos.filter((c) => !usados.has(c.id)),
    );
    if (id) usados.add(id);
    return id;
  };
  const resultado = { novas: 0, conferidas: 0, lancadas: 0, paraConferir: 0 };

  // O que estava para conferir e você lançou depois.
  for (const p of jaVieram.data!.filter((t) => t.situacao === 'conferir')) {
    const par = parDe({ tipo: p.tipo as DoBanco['tipo'], forma: p.forma as DoBanco['forma'], valor: p.valor, parcelas: p.parcelas, data: p.data });
    if (!par) continue;
    const { error } = await db.from('transacoes_banco').update({ situacao: 'conferido', lancamento_id: par }).eq('id', p.id).eq('situacao', 'conferir');
    if (error) throw error;
    resultado.conferidas++;
  }

  // As novas, da mais antiga para a mais nova.
  const vistas = new Set(jaVieram.data!.map((t) => t.pluggy_id));
  const novas = lidas.filter((t) => !vistas.has(t.pluggyId)).sort((a, b) => a.data.localeCompare(b.data));
  const cartoesDoApp = cartoes.data!.map((c) => ({ id: c.id, nome: c.nome, diaFechamento: c.dia_fechamento }));
  const nomes = (tipo: string) => categorias.data!.filter((c) => c.tipo === tipo).map((c) => c.nome);
  const sozinhas = new Map<string, { regra: NonNullable<typeof regras.data>[number]; cartao: (typeof cartoesDoApp)[number] | null; t: Lida }>();
  const linhas = novas.map((t) => {
    const base = {
      user_id: u,
      pluggy_id: t.pluggyId,
      conta: t.conta,
      tipo: t.tipo,
      forma: t.forma,
      valor: t.valor,
      parcelas: t.parcelas,
      data: t.data,
      descricao: t.descricao,
      estabelecimento: t.estabelecimento,
      nome: t.nome,
      nome_da_conta: t.nomeDaConta,
      categoria_pluggy: t.categoriaPluggy,
    };
    const par = parDe(t);
    if (par) return { ...base, situacao: 'conferido', lancamento_id: par };
    const regra = regras.data!.find((r) => r.tipo === t.tipo && r.estabelecimento === t.estabelecimento);
    const cartao = t.forma === 'credito' ? escolherCartao(cartoesDoApp, t.nomeDaConta) : null;
    if (regra && (t.forma !== 'credito' || cartao)) {
      sozinhas.set(t.pluggyId, { regra, cartao, t });
      return { ...base, situacao: 'lancado' };
    }
    const sugestao = categoriaSugerida(t.categoriaPluggy, t.tipo, nomes(t.tipo));
    const categoria = categorias.data!.find((c) => c.tipo === t.tipo && c.nome === sugestao);
    return { ...base, situacao: 'conferir', categoria_id: categoria?.id ?? null };
  });
  if (linhas.length > 0) {
    // Só o que entrou agora volta (outra busca ao mesmo tempo pode ter gravado antes).
    const { data: gravadas, error } = await db
      .from('transacoes_banco')
      .upsert(linhas, { onConflict: 'user_id,pluggy_id', ignoreDuplicates: true })
      .select('id, pluggy_id, situacao');
    if (error) throw error;
    for (const g of gravadas) {
      resultado.novas++;
      if (g.situacao === 'conferido') resultado.conferidas++;
      if (g.situacao === 'conferir') resultado.paraConferir++;
      const sozinha = sozinhas.get(g.pluggy_id);
      if (!sozinha) continue;
      const { data: criados, error: erroLancamento } = await db
        .from('lancamentos')
        .insert(
          linhasDoLancamento(sozinha.t, {
            userId: u,
            categoriaId: sozinha.regra.categoria_id,
            descricao: sozinha.regra.descricao,
            compraId: randomUUID(),
            cartao: sozinha.cartao,
          }),
        )
        .select('id, parcela')
        .order('parcela');
      if (erroLancamento) throw erroLancamento;
      await db.from('transacoes_banco').update({ lancamento_id: criados[0]!.id }).eq('id', g.id);
      resultado.lancadas++;
    }
  }

  const { error } = await db
    .from('bancos')
    .update({
      instituicao: conexao.instituicao,
      contas: conexao.contas,
      atualizado_em: conexao.atualizadoEm,
      autorizacao_ate: conexao.autorizacaoAte,
      buscado_em: agora.toISOString(),
      erro: conexao.erro,
    })
    .eq('user_id', u);
  if (error) throw error;
  return resultado;
}

/** Confere se o código da conexão existe na Pluggy (ao conectar em Ajustes). Devolve o problema, se houver. */
export async function validarConexao(itemId: string): Promise<string | null> {
  try {
    await lerConexao(await chaveDaPluggy(), itemId, new Date());
    return null;
  } catch (e) {
    if (e instanceof ErroDoBanco) return e.message === SEM_CONEXAO ? 'Não achei essa conexão na Pluggy. Confira o código (itemId).' : e.message;
    console.error('Conectar banco:', e);
    return 'Não deu para falar com a Pluggy agora. Tente de novo.';
  }
}

/** Ao abrir Lançamentos: busca de novo se a última foi há mais de 3 horas (rodando depois da resposta). */
export async function buscarSeAntigo(userId: string, agora = new Date()) {
  const { data } = await supabaseAdmin.from('bancos').select('buscado_em').eq('user_id', userId).maybeSingle();
  if (!data || (data.buscado_em && agora.getTime() - Date.parse(data.buscado_em) < 3 * 3_600_000)) return;
  await sincronizarBanco({ userId, agora });
}

export interface ParaConferir {
  id: string;
  tipo: 'despesa' | 'receita';
  forma: 'debito' | 'pix' | 'credito';
  valor: number;
  parcelas: number;
  data: string;
  descricao: string;
  /** Sugestão para o "com o quê". */
  nome: string;
  sugestao: { id: string; nome: string; icone: string } | null;
}

/** O que veio do banco e espera você (Lançamentos › Para conferir), do mais novo ao mais antigo. */
export async function paraConferir(): Promise<ParaConferir[]> {
  const supabase = await supabaseServidor();
  const { data, error } = await supabase
    .from('transacoes_banco')
    .select('id, tipo, forma, valor, parcelas, data, descricao, nome, categorias(id, nome, icone)')
    .eq('situacao', 'conferir')
    .order('data', { ascending: false })
    .order('criado_em', { ascending: false });
  if (error) throw error;
  return data.map((t) => ({
    id: t.id,
    tipo: t.tipo as ParaConferir['tipo'],
    forma: t.forma as ParaConferir['forma'],
    valor: t.valor,
    parcelas: t.parcelas,
    data: t.data,
    descricao: t.descricao,
    nome: t.nome,
    sugestao: t.categorias,
  }));
}

export interface BancoConectado {
  instituicao: string;
  contas: string;
  desde: string;
  atualizadoEm: string | null;
  autorizacaoAte: string | null;
  buscadoEm: string | null;
  erro: string | null;
}

/** A conexão do usuário logado (Ajustes › Banco); null se ainda não conectou. */
export async function bancoDoUsuario(): Promise<BancoConectado | null> {
  const supabase = await supabaseServidor();
  const { data, error } = await supabase
    .from('bancos')
    .select('instituicao, contas, desde, atualizado_em, autorizacao_ate, buscado_em, erro')
    .maybeSingle();
  if (error) throw error;
  return (
    data && {
      instituicao: data.instituicao,
      contas: data.contas,
      desde: data.desde,
      atualizadoEm: data.atualizado_em,
      autorizacaoAte: data.autorizacao_ate,
      buscadoEm: data.buscado_em,
      erro: data.erro,
    }
  );
}
