'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { diaDe } from '@/domain/datas';

/** "Quando" ao editar: o calendário do iPhone, até hoje. Envia `data` ("2026-11-06"). */
export function CampoQuando({ id, dia, onChange }: { id: string; dia: string; onChange: (dia: string) => void }) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={`data-${id}`}>Quando</Label>
      <Input
        id={`data-${id}`}
        name="data"
        type="date"
        value={dia}
        max={diaDe(new Date())}
        required
        onChange={(e) => e.target.value && onChange(e.target.value)}
      />
    </div>
  );
}

/** Meio-dia em São Paulo do dia escolhido, como data da compra (para calcular a fatura). */
export const dataDoDia = (dia: string) => new Date(`${dia}T12:00:00-03:00`).toISOString();
