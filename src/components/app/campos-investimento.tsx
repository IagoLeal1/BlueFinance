'use client';

import { useEffect, useState } from 'react';
import { Calculator } from 'lucide-react';
import { previaCdi } from '@/app/(app)/investimentos/actions';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { diaDe } from '@/domain/datas';
import { TIPOS_INVESTIMENTO } from '@/domain/investimentos';
import { formatBRL } from '@/domain/money';
import { AmountInput } from './amount-input';
import { CHIP } from './estilos';
import { Segmented } from './segmented';

export interface ValoresInvestimento {
  nome: string;
  tipo: string;
  instituicao: string;
  comoRende: 'cdi' | 'manual';
  /** Como digitado: "101,5". */
  percentual: string;
  aplicadoEm: string;
  aplicado: number;
  isentoIr: boolean;
  valorAtual: number;
}

export const VALORES_VAZIOS: ValoresInvestimento = {
  nome: '',
  tipo: '',
  instituicao: '',
  comoRende: 'manual',
  percentual: '',
  aplicadoEm: '',
  aplicado: 0,
  isentoIr: false,
  valorAtual: 0,
};

const COMO_RENDE: { valor: ValoresInvestimento['comoRende']; rotulo: string }[] = [
  { valor: 'cdi', rotulo: '% do CDI' },
  { valor: 'manual', rotulo: 'Não calcular' },
];
const IMPOSTO = [
  { valor: 'ir', rotulo: 'Tem IR (CDB)' },
  { valor: 'isento', rotulo: 'Isento (LCI, LCA)' },
] as const;

/**
 * Campos de um investimento (design kit: TelaInvestimentoCdi, painel 4): nome, onde está, tipo e "Como rende".
 * Em "% do CDI" mostra a prévia de quanto vale hoje, para conferir com o app do banco.
 */
export function CamposInvestimento({ id, inicial, investimentoId }: { id: string; inicial: ValoresInvestimento; investimentoId?: string }) {
  const [v, setV] = useState(inicial);
  const mudar = (parcial: Partial<ValoresInvestimento>) => setV((atual) => ({ ...atual, ...parcial }));

  // Prévia pelo servidor (que tem as taxas do CDI), um instante depois de parar de digitar.
  const chave = v.comoRende === 'cdi' ? `${v.percentual}|${v.aplicadoEm}|${v.aplicado}` : '';
  const [previa, setPrevia] = useState<{ chave: string; valor: number | null }>({ chave: '', valor: null });
  useEffect(() => {
    if (!chave) return;
    let cancelado = false;
    const espera = setTimeout(async () => {
      const valor = await previaCdi({ investimentoId, percentual: v.percentual, aplicadoEm: v.aplicadoEm, aplicado: v.aplicado }).catch(() => null);
      if (!cancelado) setPrevia({ chave, valor });
    }, 350);
    return () => {
      cancelado = true;
      clearTimeout(espera);
    };
  }, [chave, investimentoId, v.percentual, v.aplicadoEm, v.aplicado]);
  const valorPrevia = previa.chave === chave ? previa.valor : null;

  return (
    <>
      <div className="grid grid-cols-2 gap-3 [&>*]:min-w-0">
        <div className="grid gap-2">
          <Label htmlFor={`${id}-nome`}>Nome</Label>
          <Input id={`${id}-nome`} name="nome" placeholder="Ex.: CDB" value={v.nome} onChange={(e) => mudar({ nome: e.target.value })} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor={`${id}-instituicao`}>Onde está</Label>
          <Input
            id={`${id}-instituicao`}
            name="instituicao"
            placeholder="Ex.: XP, Nubank"
            value={v.instituicao}
            onChange={(e) => mudar({ instituicao: e.target.value })}
          />
        </div>
      </div>
      <div className="grid gap-2">
        <Label id={`${id}-rotulo-tipo`}>Tipo</Label>
        <ToggleGroup
          aria-labelledby={`${id}-rotulo-tipo`}
          value={v.tipo ? [v.tipo] : []}
          onValueChange={(t) => mudar({ tipo: (t as string[])[0] ?? '' })}
          className="flex w-full flex-wrap gap-2"
        >
          {TIPOS_INVESTIMENTO.map((t) => (
            <ToggleGroupItem key={t} value={t} className={CHIP}>
              {t}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <input type="hidden" name="tipo" value={v.tipo} />
      </div>
      <div className="grid gap-2">
        <Label id={`${id}-rotulo-rende`}>Como rende</Label>
        <Segmented nome="como_rende" rotulo="Como rende" opcoes={COMO_RENDE} valor={v.comoRende} onChange={(comoRende) => mudar({ comoRende })} />
      </div>
      {v.comoRende === 'cdi' ? (
        <>
          <div className="grid grid-cols-2 gap-3 [&>*]:min-w-0">
            <div className="grid gap-2">
              <Label htmlFor={`${id}-percentual`}>Quanto do CDI</Label>
              <div className="relative">
                <Input
                  id={`${id}-percentual`}
                  name="percentual_cdi"
                  inputMode="decimal"
                  placeholder="101,5"
                  className="pr-8 tabular-nums"
                  value={v.percentual}
                  onChange={(e) => mudar({ percentual: e.target.value })}
                />
                <span aria-hidden className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground">
                  %
                </span>
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor={`${id}-aplicado-em`}>Aplicado em</Label>
              <Input
                id={`${id}-aplicado-em`}
                name="aplicado_em"
                type="date"
                // O iOS dá ao campo de data uma largura mínima própria, maior que a coluna: zera e tira a aparência nativa.
                className="block min-w-0 appearance-none text-left"
                max={diaDe(new Date())}
                value={v.aplicadoEm}
                onChange={(e) => mudar({ aplicadoEm: e.target.value })}
              />
            </div>
          </div>
          <div className="grid gap-1">
            <span aria-hidden className="text-sm leading-none font-medium">
              Quanto aplicou
            </span>
            <AmountInput nome="aplicado" rotulo="Quanto aplicou" centavos={v.aplicado} onChange={(aplicado) => mudar({ aplicado })} />
          </div>
          <div className="grid gap-2">
            <Label id={`${id}-rotulo-ir`}>Imposto de renda</Label>
            <Segmented
              nome="ir"
              rotulo="Imposto de renda"
              opcoes={[...IMPOSTO]}
              valor={v.isentoIr ? 'isento' : 'ir'}
              onChange={(ir) => mudar({ isentoIr: ir === 'isento' })}
            />
          </div>
          {valorPrevia !== null && (
            <p className="flex gap-2 rounded-md bg-muted px-3 py-2.5 text-[13px] leading-[18px] font-semibold text-muted-foreground">
              <Calculator className="mt-px size-4 shrink-0" aria-hidden />
              <span>
                Pelo CDI, hoje vale <b className="text-foreground tabular-nums">{formatBRL(valorPrevia)}</b>. Confira com o app do banco.
              </span>
            </p>
          )}
        </>
      ) : (
        <AmountInput nome="valor_atual" rotulo="Valor atual" centavos={v.valorAtual} onChange={(valorAtual) => mudar({ valorAtual })} />
      )}
    </>
  );
}
