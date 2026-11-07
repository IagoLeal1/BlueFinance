'use client';

import { useActionState, useState } from 'react';
import { Check, Plus } from 'lucide-react';
import { criarInvestimento, type EstadoInvestimento } from '@/app/(app)/investimentos/actions';
import { TIPOS_INVESTIMENTO } from '@/domain/investimentos';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { AmountInput } from './amount-input';
import { BottomSheet } from './bottom-sheet';
import { CHIP } from './estilos';

/** Botão "Adicionar investimento" e o sheet de cadastro. */
export function NovoInvestimento() {
  const [aberto, setAberto] = useState(false);
  const [tipo, setTipo] = useState<string[]>([]);
  const [centavos, setCentavos] = useState(0);
  const [estado, acao, salvando] = useActionState(async (anterior: EstadoInvestimento, form: FormData) => {
    const r = await criarInvestimento(anterior, form);
    if (r.ok) {
      setAberto(false);
      setTipo([]);
      setCentavos(0);
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
        <div className="grid gap-2">
          <Label htmlFor="nome">Nome</Label>
          <Input id="nome" name="nome" placeholder="Ex.: Tesouro Selic 2029" />
        </div>
        <div className="grid gap-2">
          <Label id="rotulo-tipo">Tipo</Label>
          <ToggleGroup aria-labelledby="rotulo-tipo" value={tipo} onValueChange={(v) => setTipo(v as string[])} className="flex w-full flex-wrap gap-2">
            {TIPOS_INVESTIMENTO.map((t) => (
              <ToggleGroupItem key={t} value={t} className={CHIP}>
                {t}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          <input type="hidden" name="tipo" value={tipo[0] ?? ''} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="instituicao">Onde está</Label>
          <Input id="instituicao" name="instituicao" placeholder="Ex.: XP, Nubank, Rico" />
        </div>
        <AmountInput nome="valor_atual" rotulo="Valor atual" centavos={centavos} onChange={setCentavos} />
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
