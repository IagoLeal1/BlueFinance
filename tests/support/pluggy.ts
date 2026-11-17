import { randomUUID } from 'node:crypto';
import { diaDe } from '../../src/domain/datas';
import type { TransacaoPluggy } from '../../src/domain/banco';
import { clienteDe, type Usuario } from './usuarios';

/** A Pluggy de mentira (tests/support/pluggy-falso.mjs), iniciada pelo Playwright. */
const PLUGGY_FALSO = 'http://127.0.0.1:3199';

export interface ContaFalsa {
  type: 'BANK' | 'CREDIT';
  name: string;
  transacoes: (Partial<TransacaoPluggy> & Pick<TransacaoPluggy, 'id' | 'description' | 'amount' | 'date'>)[];
}

/** Dia de `k` dias atrás em São Paulo ("2026-11-15"). */
export const diaAtras = (k: number) => diaDe(new Date(Date.now() - k * 86_400_000));
/** Como a Pluggy manda a data: o dia à meia-noite UTC. */
export const naPluggy = (dia: string) => `${dia}T00:00:00.000Z`;

/** Monta um item novo na Pluggy de mentira, com as contas e transações; devolve o id (o "código da conexão"). */
export async function montarPluggy(
  contas: ContaFalsa[],
  item: { status?: string; lastUpdatedAt?: string; consentExpiresAt?: string | null; connector?: { name: string } } = {},
): Promise<string> {
  const itemId = randomUUID();
  const res = await fetch(`${PLUGGY_FALSO}/__teste/items/${itemId}`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      item: { status: 'UPDATED', lastUpdatedAt: new Date().toISOString(), consentExpiresAt: null, connector: { name: 'MeuPluggy' }, ...item },
      contas: contas.map((c) => ({
        conta: { id: randomUUID(), type: c.type, subtype: c.type === 'BANK' ? 'CHECKING_ACCOUNT' : 'CREDIT_CARD', name: c.name, marketingName: null },
        transacoes: c.transacoes.map((t) => ({ type: t.amount < 0 ? 'DEBIT' : 'CREDIT', status: 'POSTED', category: null, ...t })),
      })),
    }),
  });
  if (!res.ok) throw new Error(`Pluggy de mentira: ${res.status}`);
  return itemId;
}

/** Conecta o banco do usuário (como "Conectar" em Ajustes), importando de `desde` em diante. */
export async function semearBanco(usuario: Usuario, itemId: string, desde: string) {
  const { error } = await clienteDe(usuario).from('bancos').insert({ user_id: usuario.id, item_id: itemId, desde });
  if (error) throw error;
}
