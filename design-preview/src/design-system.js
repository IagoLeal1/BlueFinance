
const hex = (t) => t.trim();
const lum = (h) => { const c = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
const razao = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

/* cores: cada caixa lê os tokens do próprio tema */
const GRUPOS = [
  ['Base', [['bg', 'Fundo'], ['surface', 'Superfície'], ['ink', 'Texto'], ['ink-2', 'Texto de apoio'], ['brand', 'Atum, ação'], ['agua', 'Água']]],
  ['Sentido', [['receita', 'Receita, Alga'], ['despesa', 'Despesa, Coral'], ['alerta', 'Alerta, Âmbar'], ['investe', 'Investimento, Água'], ['neutro', 'Neutro, Ardósia']]],
  ['Categorias', [['cat-moradia', 'Moradia'], ['cat-mercado', 'Mercado'], ['cat-alimentacao', 'Alimentação'], ['cat-transporte', 'Transporte'], ['cat-lazer', 'Lazer'], ['cat-saude', 'Saúde'], ['cat-fatura', 'Fatura']]],
];
$('cores').innerHTML = [['light', 'Claro'], ['dark', 'Escuro']].map(([t, nome]) => `<div class="tema-caixa" data-theme="${t}"><h3>${nome}</h3>` +
  GRUPOS.map(([g, itens]) => `<p class="grupo-cor">${g}</p><div class="cores">` + itens.map(([k, n]) => `<div class="cor"><i style="background:var(--${k})"></i><span><b>${n}</b><span data-token="${k}"></span></span></div>`).join('') + `</div>`).join('') + `</div>`).join('');
const token = (caixa, k) => hex(getComputedStyle(caixa).getPropertyValue('--' + k));
document.querySelectorAll('.tema-caixa').forEach((c) => c.querySelectorAll('[data-token]').forEach((el) => (el.textContent = token(c, el.dataset.token))));

/* contraste */
const PARES = [['Texto sobre superfície', 'ink', 'surface', 4.5], ['Apoio sobre superfície', 'ink-2', 'surface', 4.5], ['Apoio sobre fundo', 'ink-2', 'bg', 4.5], ['Ação sobre superfície', 'brand', 'surface', 4.5],
  ['Texto do botão principal', 'on-brand', 'brand', 4.5], ['Receita', 'receita', 'surface', 4.5], ['Despesa', 'despesa', 'surface', 4.5], ['Alerta no selo', 'alerta', 'alerta-soft', 4.5], ['Investimento', 'investe', 'surface', 4.5],
  ...['moradia', 'mercado', 'alimentacao', 'transporte', 'lazer', 'saude', 'fatura'].map((k) => ['Ícone de ' + k.replace('alimentacao', 'alimentação').replace('saude', 'saúde'), 'cat-' + k, 'cat-' + k + '-soft', 3])];
const caixas = [...document.querySelectorAll('.tema-caixa')];
const celula = (c, a, b, min) => { const r = razao(token(c, a), token(c, b)); return `<td><span class="${r >= min ? 'selo-bom' : 'aviso'}" style="margin:0">${r.toFixed(1).replace('.', ',')}:1 ${r >= min ? 'passa' : 'falha'}</span></td>`; };
$('contraste').innerHTML = `<tr><th>Par</th><th>Mínimo</th><th>Claro</th><th>Escuro</th></tr>` +
  PARES.map(([n, a, b, min]) => `<tr><td>${n}</td><td>${String(min).replace('.', ',')}:1</td>${celula(caixas[0], a, b, min)}${celula(caixas[1], a, b, min)}</tr>`).join('');

/* espaço e raios */
$('espacos').innerHTML = [4, 8, 12, 16, 20, 24, 32].map((n) => `<div class="medida"><i style="width:${n}px;height:44px"></i><span>${n}</span></div>`).join('') + `<div class="medida"><i style="width:44px;height:44px;border-radius:12px;background:var(--brand)"></i><span>toque 44</span></div>`;
$('raios').innerHTML = [[10, 'detalhe'], [16, 'campo'], [24, 'cartão'], [32, 'saldo'], [999, 'pílula']].map(([r, n]) => `<div class="medida"><i style="width:72px;height:56px;border-radius:${r}px"></i><span>${r === 999 ? 'pílula' : r + ' ' + n}</span></div>`).join('');

/* ícones */
$('icones').innerHTML = Object.keys(ICONES).map((k) => `<div class="icone"><svg class="i" data-i="${k}"></svg><span>${k}</span></div>`).join('');

/* molas */
const MOLAS = [['agil', 'Mola ágil', 'Rigidez 380, amortecimento 32. Toque, barras, polegar.'], ['viva', 'Mola viva', 'Rigidez 260, amortecimento 18. Lente, menu, água: passa um pouco e volta.'], ['calma', 'Mola calma', 'Rigidez 170, amortecimento 24. Folhas e telas: chega sem passar.']];
$('molas').innerHTML = MOLAS.map(([k, n, d]) => `<button class="mola-demo" data-k="${k}"><span class="trilho"><i style="transition:transform var(--t-${k}) var(--mola-${k})"></i></span><span><b>${n}, <span data-dur="${k}"></span></b><span>${d}</span></span></button>`).join('');
document.querySelectorAll('[data-dur]').forEach((el) => (el.textContent = getComputedStyle(document.documentElement).getPropertyValue('--t-' + el.dataset.dur).trim().replace('ms', ' ms')));
document.querySelectorAll('.mola-demo').forEach((b) => b.addEventListener('click', () => b.classList.toggle('ida')));

/* controles vivos */
document.addEventListener('click', (e) => {
  const p = e.target.closest('.passo button');
  if (p) { const c = p.parentElement, n = Math.max(Number(c.dataset.min), Math.min(Number(c.dataset.max), Number(c.dataset.v) + Number(p.dataset.d))); c.dataset.v = n; c.querySelector('output').textContent = n + (c.dataset.suf || ''); return; }
  const s = e.target.closest('.seg[data-escolha] button');
  if (s) return s.parentElement.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', b === s));
  const i = e.target.closest('[role="switch"]');
  if (i) return i.setAttribute('aria-checked', i.getAttribute('aria-checked') !== 'true');
  const c = e.target.closest('.chip');
  if (c) return c.setAttribute('aria-pressed', c.getAttribute('aria-pressed') !== 'true');
  const t = e.target.closest('[data-tema]');
  if (t) { document.documentElement.dataset.theme = t.dataset.tema; document.querySelectorAll('[data-tema]').forEach((o) => o.setAttribute('aria-pressed', o === t)); }
});
desenhaTudo(document);
