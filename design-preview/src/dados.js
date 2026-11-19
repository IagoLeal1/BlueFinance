/* dados de exemplo, em centavos. Linha: [dia, nome, categoria, valor, detalhe] */
const META = {
  moradia: { nome: 'Moradia', i: 'casa' }, mercado: { nome: 'Mercado', i: 'carrinho' }, alimentacao: { nome: 'Alimentação', i: 'garfo' },
  transporte: { nome: 'Transporte', i: 'carro' }, lazer: { nome: 'Lazer', i: 'ingresso' }, saude: { nome: 'Saúde', i: 'coracao' },
  fatura: { nome: 'Fatura', i: 'cartao' }, receita: { nome: 'Receita', i: 'nota', cor: 'receita' },
  investe: { nome: 'Aporte', i: 'cresce', cor: 'investe' }, vr: { nome: 'Vale-refeição', i: 'garfo', cor: 'receita' },
};
const CATS = ['moradia', 'mercado', 'alimentacao', 'transporte', 'lazer', 'saude'];
const FORMAS = ['Débito', 'Pix', 'Crédito', 'VR'];
const cores = (k) => (META[k].cor ? [`var(--${META[k].cor})`, `var(--${META[k].cor}-soft)`] : [`var(--cat-${k})`, `var(--cat-${k}-soft)`]);
const MESES = {
  out: { nome: 'Outubro', curto: 'out', entrou: 750000, saiu: 401240, investiu: 50000, sobrou: 298760,
    cats: { moradia: 165000, mercado: 91230, alimentacao: 52310, transporte: 31800, lazer: 44900, saude: 16000 },
    ultimos: [['31 out', 'Farmácia', 'saude', -8900], ['30 out', 'Restaurante', 'alimentacao', -7450], ['28 out', 'Posto', 'transporte', -21000]],
    lanc: {
      debito: [['31 out', 'Farmácia', 'saude', -8900], ['30 out', 'Restaurante', 'alimentacao', -7450], ['28 out', 'Posto', 'transporte', -21000], ['20 out', 'Mercado Extra', 'mercado', -69830], ['11 out', 'Fatura do C6bank', 'fatura', -129060, 'paga'], ['10 out', 'Aluguel', 'moradia', -165000], ['8 out', 'Aporte LCI C6', 'investe', -50000], ['5 out', 'Salário', 'receita', 750000]],
      credito: [['22 out', 'Show', 'lazer', -32000], ['14 out', 'Spotify', 'lazer', -2190, 'todo mês']],
      vr: [['12 out', 'Mercado do bairro', 'mercado', -21400]],
    } },
  nov: { nome: 'Novembro', curto: 'nov', entrou: 750000, saiu: 321785, investiu: 80000, sobrou: 348215,
    cats: { moradia: 165000, mercado: 74230, alimentacao: 41890, transporte: 23640, lazer: 18900, saude: 9625 },
    ultimos: [['Hoje', 'Mercado do bairro', 'mercado', -3290, 'conferido no banco'], ['Hoje', 'Uber', 'transporte', -1840], ['5 nov', 'Salário', 'receita', 750000]],
    lanc: {
      debito: [['Hoje', 'Mercado do bairro', 'mercado', -3290, 'conferido no banco'], ['Hoje', 'Uber', 'transporte', -1840], ['Ontem', 'Farmácia', 'saude', -4625], ['Dia 11', 'Fatura do C6bank', 'fatura', -134180, 'a pagar'], ['10 nov', 'Aluguel', 'moradia', -165000], ['8 nov', 'Aporte CDB C6', 'investe', -80000], ['7 nov', 'Condomínio', 'moradia', -48000], ['6 nov', 'Mercado Extra', 'mercado', -52180], ['5 nov', 'Salário', 'receita', 750000], ['4 nov', 'Plano de saúde', 'saude', -34000], ['3 nov', 'Internet', 'moradia', -12850]],
      credito: [['Hoje', 'Cinema', 'lazer', -6400], ['Ontem', 'iFood', 'alimentacao', -5890], ['14 nov', 'Spotify', 'lazer', -2190, 'todo mês'], ['12 nov', 'Tênis', 'lazer', -14170, 'parcela 1 de 3']],
      vr: [['Hoje', 'Restaurante do Zé', 'alimentacao', -3840], ['Ontem', 'Mercado do bairro', 'mercado', -12900], ['30 out', 'Depósito do VR', 'vr', 88000]],
    } },
};
const X = { fatura: 134180, vr: 41260 };
let mes = 'nov', M = MESES.nov, tela = 0, extrato = 0, filtro = null;
const brl = (c) => (c / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const reais = (c) => Math.round(c / 100).toLocaleString('pt-BR');
const gasto = (r) => (r[3] < 0 && r[2] !== 'fatura' && r[2] !== 'investe' ? -r[3] : 0);

