import { test, expect } from '@playwright/test';
import { acharLancadoAgora, formaDoCartao, lerValorEmReais, nomeDoLugar, type JaLancado } from '../../src/domain/apple-pay';

test.describe('Apple Pay: o que a automação da Carteira manda', () => {
  test('valor: número em reais ou o texto como o iPhone mostra ("R$ 1.234,56")', () => {
    expect(lerValorEmReais(8.5)).toBe(850);
    expect(lerValorEmReais('8,50')).toBe(850);
    expect(lerValorEmReais('R$ 8,50')).toBe(850);
    expect(lerValorEmReais('R$ 1.234,56')).toBe(123456);
    expect(lerValorEmReais('1234.56')).toBe(123456);
    expect(lerValorEmReais('-R$ 32,90')).toBe(3290);
    expect(lerValorEmReais('R$ 0,00')).toBeNull();
    expect(lerValorEmReais('abc')).toBeNull();
    expect(lerValorEmReais(undefined)).toBeNull();
  });

  test('cartão novo: "Crédito" no nome é crédito; vale-refeição é VR; o resto é débito', () => {
    expect(formaDoCartao('C6 Crédito')).toBe('credito');
    expect(formaDoCartao('C6 Bank Credito Carbon')).toBe('credito');
    expect(formaDoCartao('VR Refeição')).toBe('vr');
    expect(formaDoCartao('Alelo Refeição')).toBe('vr');
    expect(formaDoCartao('Pluxee')).toBe('vr');
    expect(formaDoCartao('C6 Débito')).toBe('debito');
    expect(formaDoCartao('C6 Bank')).toBe('debito');
  });

  test('nome do lugar: como a Carteira mostra; em maiúsculas vira só a primeira letra', () => {
    expect(nomeDoLugar('  Padaria Real ')).toBe('Padaria Real');
    expect(nomeDoLugar('ATACADÃO')).toBe('Atacadão');
    expect(nomeDoLugar('')).toBe('Apple Pay');
  });
});

test.describe('Apple Pay: já lançado pelo Atalho?', () => {
  const agora = new Date('2026-11-17T12:40:00-03:00');
  const l = (extra: Partial<JaLancado>): JaLancado => ({
    id: 'x',
    valor: 3290,
    forma: 'debito',
    data: '2026-11-17T12:30:00-03:00',
    parcela: null,
    parcelas: null,
    origem: 'atalho',
    ...extra,
  });

  test('bate: mesmo valor, mesma forma, nos últimos 30 minutos; o mais recente ganha', () => {
    expect(acharLancadoAgora({ valor: 3290, forma: 'debito', agora }, [l({ id: 'a' })])).toBe('a');
    expect(acharLancadoAgora({ valor: 3290, forma: 'debito', agora }, [l({ id: 'a', forma: 'pix' })])).toBe('a');
    expect(acharLancadoAgora({ valor: 3290, forma: 'vr', agora }, [l({ id: 'v', forma: 'vr', origem: 'app' })])).toBe('v');
    expect(
      acharLancadoAgora({ valor: 3290, forma: 'debito', agora }, [
        l({ id: 'antes', data: '2026-11-17T12:15:00-03:00' }),
        l({ id: 'agora', data: '2026-11-17T12:38:00-03:00' }),
      ]),
    ).toBe('agora');
    expect(
      acharLancadoAgora({ valor: 6400, forma: 'credito', agora }, [l({ id: 'c', valor: 6400, forma: 'credito', parcela: 1, parcelas: 1 })]),
    ).toBe('c');
  });

  test('não bate: mais de 30 minutos, outro valor, outra forma, parcelado, ou que já veio do Apple Pay ou do banco', () => {
    const alvo = { valor: 3290, forma: 'debito' as const, agora };
    expect(acharLancadoAgora(alvo, [l({ data: '2026-11-17T12:09:00-03:00' })])).toBeNull();
    expect(acharLancadoAgora(alvo, [l({ valor: 3291 })])).toBeNull();
    expect(acharLancadoAgora(alvo, [l({ forma: 'vr' })])).toBeNull();
    expect(acharLancadoAgora({ ...alvo, forma: 'credito' }, [l({ forma: 'credito', parcela: 1, parcelas: 3 })])).toBeNull();
    expect(acharLancadoAgora(alvo, [l({ origem: 'applepay' })])).toBeNull();
    expect(acharLancadoAgora(alvo, [l({ origem: 'banco' })])).toBeNull();
  });
});
