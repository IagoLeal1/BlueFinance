import { test, expect } from '@playwright/test';
import { lerTextoRapido } from '../../src/domain/texto-rapido';

test.describe('texto do Atalho ("32,90 mercado do bairro")', () => {
  test('separa o valor da descrição', () => {
    expect(lerTextoRapido('32,90 mercado do bairro')).toEqual({ valor: 3290, descricao: 'mercado do bairro' });
    expect(lerTextoRapido('almoço 41')).toEqual({ valor: 4100, descricao: 'almoço' });
    expect(lerTextoRapido('1.250 aluguel')).toEqual({ valor: 125000, descricao: 'aluguel' });
    expect(lerTextoRapido('R$ 7,5 café')).toEqual({ valor: 750, descricao: 'café' });
    expect(lerTextoRapido('32.90 padaria')).toEqual({ valor: 3290, descricao: 'padaria' });
    expect(lerTextoRapido('  uber   18,40  ')).toEqual({ valor: 1840, descricao: 'uber' });
  });

  test('sem descrição, devolve descrição vazia', () => {
    expect(lerTextoRapido('18,40')).toEqual({ valor: 1840, descricao: '' });
  });

  test('sem valor (ou valor zero), devolve null', () => {
    for (const texto of ['uber', '', '   ', 'mercado 0', '0,00']) {
      expect(lerTextoRapido(texto), `"${texto}"`).toBeNull();
    }
  });
});
