/* BlueFin, prévia de design: ícones e molas compartilhados entre o protótipo e o Design System */
/* ícones: traço no estilo do Lucide, que o app já usa */
const ICONES = {
  casa: 'M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z',
  lista: 'M4 6h16M4 12h16M4 18h10',
  cresce: 'M3 17l6-6 4 4 8-8M15 7h6v6',
  ajustes: 'M4 6h10M18 6h2M14 6a2 2 0 1 0 4 0a2 2 0 1 0-4 0M4 12h2M10 12h10M6 12a2 2 0 1 0 4 0a2 2 0 1 0-4 0M4 18h8M16 18h4M12 18a2 2 0 1 0 4 0a2 2 0 1 0-4 0',
  olho: 'M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12zM12 9a3 3 0 1 0 0 6a3 3 0 1 0 0-6',
  olhoFechado: 'M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12zM12 9a3 3 0 1 0 0 6a3 3 0 1 0 0-6M4 4l16 16',
  baixo: 'M6 9l6 6 6-6', direita: 'M9 6l6 6-6 6', certo: 'M5 12l5 5 9-10',
  mais: 'M12 5v14M5 12h14', fecha: 'M6 6l12 12M18 6 6 18',
  apaga: 'M9 5h11v14H9l-6-7zM12.5 9.5l5 5M17.5 9.5l-5 5',
  entra: 'M17 7 7 17M7 8v9h9', sai: 'M7 17 17 7M8 7h9v9',
  alerta: 'M12 4 2.5 20h19zM12 10v4M12 17.2v.01',
  carrinho: 'M3 4h2l2.4 11h10.2L20 7H6M9 20a.5.5 0 1 0 0-.01M17 20a.5.5 0 1 0 0-.01',
  carro: 'M5 16v-5l2-5h10l2 5v5M3 16h18M7 16v2M17 16v2M7.5 12.5h.01M16.5 12.5h.01',
  garfo: 'M7 3v18M5 3v5a2 2 0 0 0 4 0V3M17 3c-2 2-3 4-3 7h3zM17 10v11',
  nota: 'M3 7h18v10H3zM12 10a2 2 0 1 0 0 4a2 2 0 1 0 0-4',
  ingresso: 'M4 8a2 2 0 0 0 0 8v2h16v-2a2 2 0 0 1 0-8V6H4zM14 6v12',
  coracao: 'M12 20s-7-4.5-9-9a4.5 4.5 0 0 1 9-2 4.5 4.5 0 0 1 9 2c-2 4.5-9 9-9 9z',
  cartao: 'M3 6h18v12H3zM3 10h18',
  banco: 'M3 10 12 4l9 6M5 10v8M9.5 10v8M14.5 10v8M19 10v8M3 20h18',
  toque: 'M7 8a7 7 0 0 1 0 8M11 5.5a11 11 0 0 1 0 13M15 3a15 15 0 0 1 0 18',
  raio: 'M13 3 5 13h6l-1 8 8-10h-6z',
  sino: 'M6 16v-5a6 6 0 0 1 12 0v5l2 2H4zM10 20a2 2 0 0 0 4 0',
  lua: 'M20 14A8 8 0 1 1 10 4a6.5 6.5 0 0 0 10 10z',
  esquerda: 'M15 6l-6 6 6 6', copia: 'M9 9h11v11H9zM5 15V4h11', semSinal: 'M3 9a14 14 0 0 1 18 0M6.5 12.5a9 9 0 0 1 11 0M10 16a4 4 0 0 1 4 0M12 19.5v.01M4 4l16 16',
};
const $ = (id) => document.getElementById(id);
const desenha = (el, nome) => { el.setAttribute('viewBox', '0 0 24 24'); el.setAttribute('aria-hidden', 'true'); el.innerHTML = `<path d="${ICONES[nome]}"/>`; };
const desenhaTudo = (raiz) => raiz.querySelectorAll('svg[data-i]').forEach((el) => desenha(el, el.dataset.i));

/* molas de verdade: resolve a equação e entrega como linear() para o CSS */
function mola(rigidez, amortecimento) {
  const w0 = Math.sqrt(rigidez), z = Math.min(amortecimento / (2 * w0), 0.999), wd = w0 * Math.sqrt(1 - z * z);
  const dur = 6.9 / (z * w0), pts = [];
  for (let i = 0; i <= 48; i++) {
    const t = (i / 48) * dur;
    pts.push((1 - Math.exp(-z * w0 * t) * (Math.cos(wd * t) + ((z * w0) / wd) * Math.sin(wd * t))).toFixed(4));
  }
  pts[48] = '1';
  return { curva: `linear(${pts.join(',')})`, ms: Math.round(dur * 1000) };
}
if (CSS.supports('transition-timing-function', 'linear(0, 1)')) {
  for (const [nome, k, c] of [['agil', 380, 32], ['viva', 260, 18], ['calma', 170, 24]]) {
    const m = mola(k, c);
    document.documentElement.style.setProperty(`--mola-${nome}`, m.curva);
    document.documentElement.style.setProperty(`--t-${nome}`, m.ms + 'ms');
  }
}

