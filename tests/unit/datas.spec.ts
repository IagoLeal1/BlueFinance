import { test, expect } from '@playwright/test';
import { rotuloDoDia } from '../../src/domain/datas';

test.describe('datas', () => {
  test('dá nome ao dia de um lançamento no horário de São Paulo', () => {
    const agora = new Date('2026-11-07T15:00:00-03:00');
    expect(rotuloDoDia('2026-11-07T00:10:00-03:00', agora)).toBe('Hoje · 7 nov');
    expect(rotuloDoDia('2026-11-07T02:30:00Z', agora)).toBe('Ontem · 6 nov'); // 23h30 do dia 6 em SP
    expect(rotuloDoDia('2026-11-05T12:00:00-03:00', agora)).toBe('5 nov');
    expect(rotuloDoDia('2025-12-24T12:00:00-03:00', agora)).toBe('24 dez 2025');
  });
});
