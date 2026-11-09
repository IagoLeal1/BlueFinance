import { test, expect } from '@playwright/test';
import { aliquotaIr, comecaARender, rendimentoCdi, ultimoCdiEsperado } from '../../src/domain/rendimento';

// CDI que o Banco Central publicou para 5/11/2026: 0,050788% ao dia (≈ 13,65% ao ano).
const CDI_5_NOV = { dia: '2026-11-05', taxa: 0.050788 };

test.describe('rendimento pelo CDI', () => {
  test('o CDB do C6: R$ 4.449,04 a 101,5% do CDI rende R$ 2,29 em um dia útil', () => {
    const r = rendimentoCdi({
      lotes: [{ data: '2026-11-05', valor: 444904 }],
      taxas: [CDI_5_NOV],
      percentual: 101.5,
      hoje: '2026-11-08',
      isentoIr: false,
    });
    // 444.904 × (1 + 0,00050788 × 1,015) = 445.133,35 centavos
    expect(r.bruto).toBe(445133);
    expect(r.aportado).toBe(444904);
    expect(r.rendeu).toBe(229);
    expect(r.ultimoDia).toEqual({ dia: '2026-11-05', ganho: 229 });
    // 3 dias corridos: IOF de 90% do rendimento (206) e IR de 22,5% sobre o resto (23 → 5).
    expect(r.iof).toBe(206);
    expect(r.ir).toBe(5);
    expect(r.liquido).toBe(444922);
    expect(r.lotes).toEqual([{ data: '2026-11-05', valor: 444904, bruto: 445133, diasUteis: 1, irCai: { aliquota: 20, em: '2027-05-05' } }]);
  });

  test('cada aporte rende a partir da própria data, só nos dias com CDI e antes de hoje', () => {
    const r = rendimentoCdi({
      lotes: [
        { data: '2026-11-03', valor: 100000 },
        // Domingo: começa a render na segunda (o primeiro dia com CDI).
        { data: '2026-11-08', valor: 50000 },
      ],
      taxas: [
        { dia: '2026-11-03', taxa: 0.05 },
        { dia: '2026-11-04', taxa: 0.05 },
        { dia: '2026-11-09', taxa: 0.05 },
        { dia: '2026-11-10', taxa: 0.05 }, // ainda é hoje: não conta
      ],
      percentual: 100,
      hoje: '2026-11-10',
      isentoIr: false,
    });
    // 100.000 × 1,0005³ = 100.150,08 → 100.150; 50.000 × 1,0005 = 50.025
    expect(r.lotes.map((l) => [l.bruto, l.diasUteis])).toEqual([[100150, 3], [50025, 1]]);
    expect(r.bruto).toBe(150175);
    expect(r.aportado).toBe(150000);
    expect(r.ultimoDia).toEqual({ dia: '2026-11-09', ganho: 75 });
  });

  test('ajustar ao valor do banco: a diferença vira rendimento e rende junto dali em diante', () => {
    const r = rendimentoCdi({
      lotes: [
        { data: '2026-11-03', valor: 100000 },
        { data: '2026-11-04', valor: 10, ajuste: true },
      ],
      taxas: [{ dia: '2026-11-03', taxa: 0.05 }],
      percentual: 100,
      hoje: '2026-11-05',
      isentoIr: true,
    });
    expect(r.bruto).toBe(100060);
    expect(r.aportado).toBe(100000);
    expect(r.rendeu).toBe(60);
    expect(r.lotes).toHaveLength(1); // o ajuste não aparece como aporte
    // LCI/LCA: sem IR. Ainda nos primeiros 30 dias: IOF (2 dias corridos = 93%).
    expect(r.ir).toBe(0);
    expect(r.iof).toBe(56);
  });

  test('IR regressivo pelo prazo de cada aporte, e IOF só nos primeiros 30 dias', () => {
    expect([180, 181, 360, 361, 720, 721].map(aliquotaIr)).toEqual([22.5, 20, 20, 17.5, 17.5, 15]);
    const r = rendimentoCdi({
      lotes: [{ data: '2024-01-02', valor: 100000 }],
      taxas: [{ dia: '2024-01-02', taxa: 1 }],
      percentual: 100,
      hoje: '2026-11-08',
      isentoIr: false,
    });
    expect(r.rendeu).toBe(1000);
    expect(r.iof).toBe(0);
    expect(r.ir).toBe(150);
    expect(r.lotes[0]!.irCai).toBeNull();
  });

  test('o aporte de fim de semana começa a render no próximo dia útil', () => {
    expect(comecaARender('2026-11-08')).toBe('2026-11-09'); // domingo → segunda
    expect(comecaARender('2026-11-07')).toBe('2026-11-09'); // sábado → segunda
    expect(comecaARender('2026-11-10')).toBe('2026-11-10');
  });

  test('o Banco Central publica o CDI com atraso: o último esperado é dois dias úteis antes de hoje', () => {
    expect(ultimoCdiEsperado('2026-11-08')).toBe('2026-11-05'); // domingo: o de quinta
    expect(ultimoCdiEsperado('2026-11-10')).toBe('2026-11-06'); // terça: o de sexta
    expect(ultimoCdiEsperado('2026-11-12')).toBe('2026-11-10');
  });
});
