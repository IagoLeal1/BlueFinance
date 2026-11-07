'use client';

import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { entrar } from './actions';

export function FormEntrar() {
  const [estado, acao, enviando] = useActionState(entrar, {});
  return (
    <form action={acao} className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor="email">E-mail</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="senha">Senha</Label>
        <Input id="senha" name="senha" type="password" autoComplete="current-password" required />
      </div>
      {estado.erro && (
        <p role="alert" className="text-sm font-semibold text-negative">
          {estado.erro}
        </p>
      )}
      <Button type="submit" disabled={enviando} className="mt-2 w-full">
        Entrar
      </Button>
    </form>
  );
}
