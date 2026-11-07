'use client';

import { useActionState, useState } from 'react';
import { Copy, KeyRound } from 'lucide-react';
import { gerarToken } from '@/app/(app)/ajustes/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

/** Gera o token do Atalho e mostra uma única vez, com botão de copiar. */
export function TokenAtalho({ jaExiste }: { jaExiste: boolean }) {
  const [estado, acao, gerando] = useActionState(gerarToken, {});
  const [copiado, setCopiado] = useState(false);

  return (
    <div className="grid gap-3">
      {estado.token && (
        <div className="grid gap-2">
          <Label htmlFor="token">Token do Atalho</Label>
          <Input id="token" readOnly value={estado.token} className="font-mono text-sm" onFocus={(e) => e.currentTarget.select()} />
          <p className="text-[13px] leading-[18px] font-semibold text-muted-foreground">
            Copie agora: por segurança ele não aparece de novo. Cole no Atalho do iPhone.
          </p>
          <Button
            type="button"
            variant="secondary"
            onClick={async () => {
              await navigator.clipboard?.writeText(estado.token!);
              setCopiado(true);
            }}
          >
            <Copy aria-hidden />
            {copiado ? 'Copiado' : 'Copiar'}
          </Button>
        </div>
      )}
      {estado.erro && (
        <p role="alert" className="text-sm font-semibold text-negative">
          {estado.erro}
        </p>
      )}
      <form action={acao}>
        <Button type="submit" disabled={gerando} variant={estado.token ? 'ghost' : 'default'} className="w-full">
          <KeyRound aria-hidden />
          {jaExiste || estado.token ? 'Gerar token novo' : 'Gerar token do Atalho'}
        </Button>
      </form>
    </div>
  );
}
