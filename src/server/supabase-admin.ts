import 'server-only';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/database.types';

/** Cliente com a chave secreta: ignora RLS. Só para rotas do servidor, nunca no navegador. */
export const supabaseAdmin = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false } },
);
