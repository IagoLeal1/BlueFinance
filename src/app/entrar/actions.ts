'use server';

import { redirect } from 'next/navigation';
import { supabaseServidor } from '@/lib/supabase/server';

export interface EstadoEntrar {
  erro?: string;
}

export async function entrar(_anterior: EstadoEntrar, form: FormData): Promise<EstadoEntrar> {
  const supabase = await supabaseServidor();
  const { error } = await supabase.auth.signInWithPassword({
    email: String(form.get('email') ?? ''),
    password: String(form.get('senha') ?? ''),
  });
  if (error) return { erro: 'E-mail ou senha incorretos.' };
  redirect('/');
}
