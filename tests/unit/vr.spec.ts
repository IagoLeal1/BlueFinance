import { test, expect } from '@playwright/test';
import { depositosDevidos, diaDoDeposito, proximoDeposito, saldoDoVr } from '../../src/domain/vr';

test.describe('VR (vale-refeição)', () => {
  test('o depósito cai no dia escolhido; dia 31 em mês curto cai no último dia', () => {
    expect(diaDoDeposito('2026-11', 5)).toBe('2026-11-05');
    expect(diaDoDeposito('2026-11', 31)).toBe('2026-11-30');
    expect(diaDoDeposito('2027-02', 30)).toBe('2027-02-28');
    expect(diaDoDeposito('2028-02', 31)).toBe('2028-02-29');
  });

  test('depósitos devidos: depois do dia em que o VR foi configurado, até hoje (o de hoje já caiu)', () => {
    const vr = { valorMensal: 90000, dia: 5, desde: '2026-09-05T15:00:00-03:00' };
    // Configurado em 5/set: o saldo informado já tinha o depósito de setembro.
    expect(depositosDevidos(vr, new Date('2026-11-04T12:00:00-03:00'))).toEqual([
      { competencia: '2026-10', dia: '2026-10-05', valor: 90000 },
    ]);
    expect(depositosDevidos(vr, new Date('2026-11-05T08:00:00-03:00'))).toEqual([
      { competencia: '2026-10', dia: '2026-10-05', valor: 90000 },
      { competencia: '2026-11', dia: '2026-11-05', valor: 90000 },
    ]);
    // Configurado hoje: nenhum depósito ainda.
    expect(depositosDevidos({ ...vr, desde: '2026-11-12T10:00:00-03:00' }, new Date('2026-11-12T18:00:00-03:00'))).toEqual([]);
    // Horário de São Paulo: 5/nov 01h UTC ainda é 4/nov em São Paulo.
    expect(depositosDevidos(vr, new Date('2026-11-05T01:00:00Z')).map((d) => d.competencia)).toEqual(['2026-10']);
  });

  test('próximo depósito: o primeiro dia do VR depois de hoje', () => {
    expect(proximoDeposito(5, new Date('2026-11-12T12:00:00-03:00'))).toBe('2026-12-05');
    expect(proximoDeposito(20, new Date('2026-11-12T12:00:00-03:00'))).toBe('2026-11-20');
    // No dia do depósito, ele já caiu: o próximo é no mês seguinte.
    expect(proximoDeposito(12, new Date('2026-11-12T12:00:00-03:00'))).toBe('2026-12-12');
    expect(proximoDeposito(31, new Date('2027-01-31T12:00:00-03:00'))).toBe('2027-02-28');
    expect(proximoDeposito(5, new Date('2026-12-20T12:00:00-03:00'))).toBe('2027-01-05');
  });

  test('saldo: o que entrou no VR menos o que saiu dele', () => {
    expect(
      saldoDoVr([
        { tipo: 'receita', valor: 41230 },
        { tipo: 'receita', valor: 90000 },
        { tipo: 'despesa', valor: 3290 },
        { tipo: 'despesa', valor: 10000 },
      ]),
    ).toBe(117940);
    expect(saldoDoVr([])).toBe(0);
  });
});
