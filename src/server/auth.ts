import 'server-only';
import { supabaseAdmin } from './supabase-admin';

export function bearer(request: Request): string | null {
  const h = request.headers.get('authorization');
  return h?.startsWith('Bearer ') ? h.slice(7).trim() || null : null;
}

/** Id do usuário logado a partir do access token do Supabase no header Authorization. */
export async function usuarioDaSessao(request: Request): Promise<string | null> {
  const jwt = bearer(request);
  if (!jwt) return null;
  const { data, error } = await supabaseAdmin.auth.getUser(jwt);
  return error ? null : data.user.id;
}
