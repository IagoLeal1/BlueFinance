'use client';

import { useActionState, useState } from 'react';
import { Check, Plus } from 'lucide-react';
import { criarInvestimento, type EstadoInvestimento } from '@/app/(app)/investimentos/actions';
import { Button } from '@/components/ui/button';
import { BottomSheet } from './bottom-sheet';
import { CamposInvestimento, VALORES_VAZIOS } from './campos-investimento';

/** Botão "Adicionar investimento" e o sheet de cadastro. */
export function NovoInvestimento() {
  const [aberto, setAberto] = useState(false);
  // Trocar a chave limpa os campos depois de salvar.
  const [rodada, setRodada] = useState(0);
  const [estado, acao, salvando] = useActionState(async (anterior: EstadoInvestimento, form: FormData) => {
    const r = await criarInvestimento(anterior, form);
    if (r.ok) {
      setAberto(false);
      setRodada((n) => n + 1);
    }
    return r;
  }, {});

  return (
    <BottomSheet
      titulo="Novo investimento"
      aberto={aberto}
      onAbertoChange={setAberto}
      gatilho={
        <Button variant="secondary" className="w-full">
          <Plus aria-hidden />
          Adicionar investimento
        </Button>
      }
    >
      <form action={acao} className="grid gap-4">
        <CamposInvestimento key={rodada} id="novo-investimento" inicial={VALORES_VAZIOS} />
        {estado.erro && (
          <p role="alert" className="text-sm font-semibold text-negative">
            {estado.erro}
          </p>
        )}
        <Button type="submit" disabled={salvando} className="w-full">
          <Check aria-hidden />
          Salvar investimento
        </Button>
      </form>
    </BottomSheet>
  );
}
