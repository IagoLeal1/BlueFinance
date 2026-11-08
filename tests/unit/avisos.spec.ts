import { test, expect } from '@playwright/test';
import { avisosDeFatura } from '../../src/domain/avisos';

test.describe('aviso da fatura', () => {
  const fatura = { cartao: 'C6bank', mes: '2026-11', total: 123456 };

  test('avisa um dia antes e no dia do vencimento, e abre o Crédito daquele mês', () => {
    expect(avisosDeFatura([{ ...fatura, vence: '2026-11-11' }], '2026-11-10')).toEqual([
      { titulo: 'BlueFin', corpo: 'A fatura do C6bank vence amanhã: R$ 1.234,56', url: '/lancamentos?mes=2026-11&ver=credito' },
    ]);
    expect(avisosDeFatura([{ ...fatura, vence: '2026-11-11' }], '2026-11-11')).toEqual([
      { titulo: 'BlueFin', corpo: 'Hoje vence a fatura do C6bank: R$ 1.234,56', url: '/lancamentos?mes=2026-11&ver=credito' },
    ]);
    // Virada de mês: vence dia 1º, avisa no último dia do mês anterior.
    expect(avisosDeFatura([{ ...fatura, vence: '2026-12-01' }], '2026-11-30')).toHaveLength(1);
  });

  test('não avisa fora desses dias nem fatura sem valor', () => {
    expect(avisosDeFatura([{ ...fatura, vence: '2026-11-11' }], '2026-11-09')).toEqual([]);
    expect(avisosDeFatura([{ ...fatura, vence: '2026-11-11' }], '2026-11-12')).toEqual([]);
    expect(avisosDeFatura([{ ...fatura, total: 0, vence: '2026-11-11' }], '2026-11-10')).toEqual([]);
  });
});
