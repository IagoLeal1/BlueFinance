import 'server-only';
import { supabaseServidor } from '@/lib/supabase/server';
import { supabaseAdmin } from './supabase-admin';

/**
 * Cliente do banco para ler os dados de alguém: sem `dono`, pela sessão do site (o RLS filtra); com `dono` (o
 * usuário do token do Atalho ou do app do iPhone), pela chave secreta — e quem chama filtra por `user_id`.
 */
export async function clienteDe(dono?: string) {
  return dono ? supabaseAdmin : await supabaseServidor();
}
