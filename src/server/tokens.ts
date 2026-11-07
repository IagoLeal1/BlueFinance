import 'server-only';
import { createHash, randomBytes } from 'node:crypto';
import { supabaseAdmin } from './supabase-admin';

const hash = (token: string) => createHash('sha256').update(token).digest('hex');

/** Cria um token pessoal ("bf_" + 32 bytes aleatórios) e guarda só o hash. */
export async function criarTokenPessoal(userId: string): Promise<string> {
  const token = `bf_${randomBytes(32).toString('base64url')}`;
  const { error } = await supabaseAdmin.from('tokens_pessoais').insert({ user_id: userId, hash: hash(token) });
  if (error) throw error;
  return token;
}

/** Id do dono do token pessoal enviado em "Authorization: Bearer bf_…", ou null se não existir. */
export async function usuarioDoToken(token: string | null): Promise<string | null> {
  if (!token?.startsWith('bf_')) return null;
  const { data } = await supabaseAdmin
    .from('tokens_pessoais')
    .update({ usado_em: new Date().toISOString() })
    .eq('hash', hash(token))
    .select('user_id')
    .maybeSingle();
  return data?.user_id ?? null;
}
