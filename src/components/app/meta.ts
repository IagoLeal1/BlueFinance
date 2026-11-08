import { diaCurto } from '@/domain/datas';
import type { LancamentoListado } from '@/server/lancamentos';

const FORMA = { debito: 'Débito', pix: 'Pix', credito: 'Crédito' } as const;

/**
 * Texto de baixo da linha (design kit: TelaFatura): "Lazer · 1/3 · comprado em 7 nov",
 * "Mercado · à vista · 20 nov", "Transporte · Débito · pelo Atalho", "Salário".
 */
export function metaDe(l: LancamentoListado): string {
  const partes = [l.categoria];
  if (l.forma === 'credito') {
    const parcelado = (l.parcelas ?? 1) > 1;
    const quando = parcelado ? `comprado em ${diaCurto(l.data)}` : diaCurto(l.data);
    // Espaços não separáveis: a data não quebra no meio ("7" numa linha, "out" na outra).
    partes.push(parcelado ? `${l.parcela}/${l.parcelas}` : 'à vista', quando.replaceAll(' ', '\u00a0'));
  } else if (l.forma) {
    partes.push(FORMA[l.forma]);
  }
  if (l.origem === 'atalho') partes.push('pelo Atalho');
  return partes.join(' · ');
}
