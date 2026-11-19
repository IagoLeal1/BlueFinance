'use client';

import { useActionState } from 'react';
import { CircleAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { entrar } from './actions';

/** Campo em vidro claro sobre o degradê (design-preview: .campo-vidro). */
const CAMPO =
  'vidro-claro relative h-[52px] w-full rounded-[16px] border-0 px-4 text-[17px] text-white outline-none placeholder:text-white/72 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-white';

export function FormEntrar() {
  const [estado, acao, enviando] = useActionState(entrar, {});
  return (
    <form action={acao} className="grid gap-3.5">
      <label className="grid gap-1.5 text-sm font-semibold">
        E-mail
        <input name="email" type="email" autoComplete="email" required placeholder="voce@exemplo.com" className={CAMPO} />
      </label>
      <label className="grid gap-1.5 text-sm font-semibold">
        Senha
        <input name="senha" type="password" autoComplete="current-password" required className={CAMPO} />
      </label>
      {estado.erro && (
        <p role="alert" className="flex items-center gap-2 rounded-[14px] bg-white/16 px-3 py-2 text-sm font-semibold text-white">
          <CircleAlert className="size-4 shrink-0" aria-hidden />
          {estado.erro}
        </p>
      )}
      <Button type="submit" variant="secondary" disabled={enviando} className="mt-1.5 w-full bg-white text-hero hover:bg-white/90">
        Entrar
      </Button>
    </form>
  );
}
