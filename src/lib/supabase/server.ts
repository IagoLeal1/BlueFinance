import 'server-only';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from './database.types';

/** Cliente do Supabase com a sessão do usuário (cookies), para Server Components e Server Actions. */
export async function supabaseServidor() {
  const cookieStore = await cookies();
  return createServerClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (lista) => {
        try {
          for (const { name, value, options } of lista) cookieStore.set(name, value, options);
        } catch {
          // Chamado de um Server Component: o proxy é quem renova os cookies.
        }
      },
    },
  });
}
