const INV = [
  { nome: 'CDB C6', taxa: '102% do CDI', valor: 841210, aportado: 800000, mesR: 6140, ir: true },
  { nome: 'LCI C6', taxa: '95% do CDI, sem IR', valor: 443422, aportado: 430000, mesR: 3478, ir: false },
];
const iphone = $('iphone'), sobrou = $('sobrou'), rolagem = document.querySelector('.rolagem');
const calmo = matchMedia('(prefers-reduced-motion: reduce)');
const mac = () => iphone.dataset.forma === 'mac';
const anima = (el, c) => { el.classList.remove('entra', 'empurra', 'chega'); void el.offsetWidth; el.classList.add(c); };
const rolaTopo = (top = 0) => rolagem.scrollTo({ top, behavior: calmo.matches ? 'auto' : 'smooth' });

/* olhinho: cada valor guarda o texto real e mostra a máscara quando escondido */
let escondido = false;
const mascara = (t) => (/^[+−-]?R\$/.test(t) ? 'R$ ••••' : '••••');
const registra = (raiz) => raiz.querySelectorAll('[data-dinheiro]').forEach((el) => {
  if (!('real' in el.dataset)) el.dataset.real = el.textContent;
  el.textContent = escondido ? mascara(el.dataset.real) : el.dataset.real;
});
const poe = (el, t) => { el.dataset.real = t; el.textContent = escondido ? mascara(t) : t; };

const editavel = (r) => mes === 'nov' && (CATS.includes(r[2]) || r[2] === 'vr');
const linha = (r, nova, aba, i) => {
  const [dia, nome, k, c, extra] = r, [f, s] = cores(k), cls = c > 0 ? 'entrou' : k === 'fatura' ? '' : 'saiu';
  const toque = aba && editavel(r) ? ` role="button" tabindex="0" data-aba="${aba}" data-i="${i}"` : '';
  return `<div class="mov${nova ? ' nova' : ''}${toque ? ' toca' : ''}"${toque}><span class="selo-cat" style="background:${s};color:${f}"><svg class="i" data-i="${META[k].i}"></svg></span>
    <span class="txt"><b>${nome}</b><span>${META[k].nome}${extra ? ', ' + extra : ''}</span></span><span class="dir"><strong class="${cls}">${c > 0 ? '+' : '−'}${brl(Math.abs(c))}</strong><span>${dia}</span></span></div>`;
};

function pintaCats() {
  const total = CATS.reduce((s, k) => s + M.cats[k], 0), ordem = [...CATS].sort((a, b) => M.cats[b] - M.cats[a]);
  const pct = (k) => Math.round((M.cats[k] / total) * 100);
  $('barra').innerHTML = ordem.map((k, n) => `<i style="flex:${M.cats[k]};background:var(--cat-${k});--n:${n}"></i>`).join('');
  $('barra').setAttribute('aria-label', ordem.map((k) => `${META[k].nome} ${pct(k)}%`).join(', '));
  $('cats').innerHTML = ordem.map((k) =>
    `<button class="cat pressiona" data-k="${k}" aria-label="${META[k].nome}, R$ ${brl(M.cats[k])}. Ver lançamentos"><span class="ponto" style="background:var(--cat-${k})"></span><span class="nome">${META[k].nome}</span><span class="pct">${pct(k)}%</span><span class="v" data-dinheiro>${brl(M.cats[k])}</span></button>`).join('');
  $('cats').querySelectorAll('button').forEach((b) => b.addEventListener('click', () => { filtro = b.dataset.k; extrato = 0; vaiPara(1); }));
  registra($('cats'));
}
function pintaUltimos(nova) {
  $('ultimos').innerHTML = M.ultimos.slice(0, 3).map((r, n) => linha(r, nova && n === 0)).join('');
  desenhaTudo($('ultimos'));
}
function pintaLista() {
  const aba = ['debito', 'credito', 'vr'][extrato], m = M.nome.toLowerCase(), atual = mes === 'nov';
  const linhas = M.lanc[aba].map((r, i) => [r, i]).filter(([r]) => !filtro || r[2] === filtro), soma = linhas.reduce((s, [r]) => s + gasto(r), 0);
  const onde = ['no débito', 'no crédito', 'no VR'][extrato];
  $('aba-rotulo').textContent = filtro ? `${META[filtro].nome} ${onde} em ${m}`
    : [`Saiu da conta em ${m}`, atual ? 'Fatura aberta do C6bank, fecha dia 4' : `Compras no crédito em ${m}`, atual ? 'Saldo do vale-refeição' : `Gasto no VR em ${m}`][extrato];
  poe($('aba-valor'), 'R$ ' + brl(!filtro && atual && extrato === 2 ? X.vr : soma));
  $('lista').innerHTML = linhas.length ? `<div class="cartao" style="padding:4px 16px">${linhas.map(([r, i]) => linha(r, false, aba, i)).join('')}</div>`
    : `<div class="vazio"><svg viewBox="0 0 132 56" aria-hidden="true"><path d="M0 40Q16.5 32 33 40T66 40T99 40T132 40" fill="none" stroke="var(--agua)" stroke-width="2.5" stroke-linecap="round"/><path d="M56 40c5-6 9-14 11-22 5 7 8 14 9 22z" fill="var(--brand)"/><path d="M8 50h116" stroke="var(--line)" stroke-width="2" stroke-linecap="round"/></svg>
      <b>Mar calmo por aqui</b><span>Nenhum gasto de ${META[filtro].nome} ${onde} em ${m}.</span></div>`;
  desenhaTudo($('lista'));
  $('lanc-mes').textContent = M.nome + (atual ? '. Toque num gasto para editar.' : '');
  $('conferir') && ($('conferir').hidden = !atual);
  $('extratos').style.setProperty('--i', extrato);
  $('extratos').querySelectorAll('button').forEach((b, n) => b.setAttribute('aria-pressed', n === extrato));
  $('filtro').querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', (b.dataset.k || null) === filtro));
}
$('filtro').innerHTML = `<button class="chip pressiona">Todas</button>` + CATS.map((k) => `<button class="chip pressiona" data-k="${k}"><span class="ponto" style="background:var(--cat-${k})"></span>${META[k].nome}</button>`).join('');
$('filtro').querySelectorAll('button').forEach((b) => b.addEventListener('click', () => { filtro = b.dataset.k || null; pintaLista(); }));
$('extratos').querySelectorAll('button').forEach((b, n) => b.addEventListener('click', () => { extrato = n; pintaLista(); }));
function abreLinha(el) {
  const aba = el.dataset.aba, r = M.lanc[aba][el.dataset.i];
  if (r[2] === 'vr') return abreFolha('valor', { titulo: 'Quanto caiu de VR?', acao: 'Acertar depósito', valor: r[3], ok: (v) => { X.vr += v - r[3]; r[3] = v; repinta(MESES.nov.sobrou); } });
  abreFolha('editar', { linha: r, aba });
}
$('lista').addEventListener('click', (e) => { const el = e.target.closest('.toca'); if (el) abreLinha(el); });
$('lista').addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.classList.contains('toca')) abreLinha(e.target); });

function pintaInv() {
  const abertos = [...document.querySelectorAll('#inv-lista .inv')].map((b) => b.getAttribute('aria-expanded') === 'true');
  poe($('inv-total'), 'R$ ' + brl(INV.reduce((s, v) => s + v.valor, 0)));
  $('inv-lista').innerHTML = `<div class="cartao" style="padding:2px 16px">` + INV.map((v, n) => {
    const liquido = v.ir ? v.valor - Math.round((v.valor - v.aportado) * 0.2) : v.valor;
    return `<button class="inv" aria-expanded="${!!abertos[n]}"><span class="selo-cat" style="background:var(--investe-soft);color:var(--investe)"><svg class="i" data-i="cresce"></svg></span>
      <span class="txt"><b>${v.nome}</b><span>${v.taxa}</span></span><span class="dir"><strong data-dinheiro>R$ ${brl(v.valor)}</strong><span>${v.mesR ? `+R$ ${brl(v.mesR)} no mês` : 'Começou hoje'}</span></span></button>
      <div class="detalhe"><div><dl><div><dt>Você aportou</dt><dd data-dinheiro>R$ ${brl(v.aportado)}</dd></div><div><dt>Rendimento bruto</dt><dd data-dinheiro>R$ ${brl(v.valor - v.aportado)}</dd></div><div><dt>Líquido se resgatar hoje</dt><dd data-dinheiro>R$ ${brl(liquido)}</dd></div></dl>
      <div class="dupla" style="margin:0 0 14px 52px"><button class="botao-2 pressiona" data-acao="aportar" data-n="${n}">Aportar</button><button class="botao-2 pressiona" data-acao="ajustar" data-n="${n}">Ajustar valor</button></div></div></div>`;
  }).join('') + `</div>`;
  desenhaTudo($('inv-lista')); registra($('inv-lista'));
  $('inv-lista').querySelectorAll('.inv').forEach((b) => b.addEventListener('click', () => b.setAttribute('aria-expanded', b.getAttribute('aria-expanded') !== 'true')));
}

let quadro;
function contar(el, de, para) {
  cancelAnimationFrame(quadro);
  if (calmo.matches || escondido) return poe(el, brl(para));
  const t0 = performance.now();
  (function passo(t) {
    const p = Math.min((t - t0) / 900, 1);
    el.textContent = brl(Math.round(de + (para - de) * (1 - Math.pow(1 - p, 3))));
    if (p < 1) quadro = requestAnimationFrame(passo); else poe(el, brl(para));
  })(t0);
}
function pintaNivel() {
  const pct = Math.max(0, Math.min(100, Math.round((M.sobrou / M.entrou) * 100)));
  $('agua').style.setProperty('--pct', pct);
  $('pct').textContent = pct + '% do que entrou';
}
/* tudo que depende do mês */
function pintaMes() {
  const atual = mes === 'nov';
  $('titulo').textContent = M.nome;
  $('heroi').setAttribute('aria-label', 'Resumo de ' + M.nome.toLowerCase());
  $('mes-rotulo').textContent = M.curto;
  poe($('entrou'), reais(M.entrou)); poe($('saiu'), reais(M.saiu)); poe($('investiu'), reais(M.investiu));
  poe($('depois'), 'R$ ' + brl(M.sobrou - X.fatura));
  $('depois-linha').hidden = $('cartao-vr').hidden = $('cartao-c6').hidden = !atual;
  pintaNivel(); pintaCats(); pintaUltimos(); pintaLista();
  document.querySelectorAll('#menu button').forEach((b) => b.setAttribute('aria-checked', b.dataset.mes === mes));
}
/* abertura: água sobe, saldo conta, barra se desenha */
function abrir() {
  iphone.classList.remove('ligado');
  void iphone.offsetWidth;
  iphone.classList.add('ligado');
  contar(sobrou, 0, M.sobrou);
}

const olho = $('olho');
olho.addEventListener('click', () => {
  escondido = !escondido;
  cancelAnimationFrame(quadro);
  sobrou.dataset.real = brl(M.sobrou);
  olho.setAttribute('aria-pressed', escondido);
  olho.setAttribute('aria-label', escondido ? 'Mostrar valores' : 'Esconder valores');
  desenha(olho.querySelector('svg'), escondido ? 'olhoFechado' : 'olho');
  registra(iphone);
});

/* botões do topo: vidro claro sobre o saldo, regular sobre o conteúdo; cada tela mostra os seus */
const botaoMes = $('mes'), menu = $('menu');
let emSub = false;
function topo() {
  const claro = !mac() && tela === 0 && rolagem.scrollTop < 380;
  [olho, botaoMes].forEach((el) => el.classList.toggle('vidro--claro', claro));
  olho.hidden = emSub || !(tela === 0 || tela === 2);
  botaoMes.hidden = emSub || tela > 1;
}
rolagem.addEventListener('scroll', topo, { passive: true });

/* menu do mês */
function abreMenu(sim) { menu.classList.toggle('aberto', sim); menu.inert = !sim; botaoMes.setAttribute('aria-expanded', sim); }
botaoMes.addEventListener('click', (e) => { e.stopPropagation(); abreMenu(!menu.classList.contains('aberto')); });
menu.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => trocaMes(b.dataset.mes)));
function trocaMes(k) {
  abreMenu(false);
  if (k === mes) return;
  mes = k; M = MESES[k];
  pintaMes();
  if (tela === 0) abrir(); else poe(sobrou, brl(M.sobrou));
}

/* abas: nas pontas a lente bate na borda e amassa, em vez de passar dela */
const nav = document.querySelector('.abas nav'), lente = nav.querySelector('.lente'), botoesAba = [...nav.querySelectorAll('button')];
const TELAS = ['inicio', 'lancamentos', 'investir', 'ajustes'].map((t) => $('tela-' + t));
function moveLente(n, semAnimar) {
  const ponta = n === 0 || n === botoesAba.length - 1, v = mac();
  nav.classList.toggle('borda', ponta);
  nav.style.setProperty('--aba', n);
  if (calmo.matches || semAnimar) return;
  lente.getAnimations().forEach((a) => a.effect instanceof KeyframeEffect && a.effect.getKeyframes().some((q) => 'scale' in q) && a.cancel());
  lente.style.transformOrigin = n === 0 ? (v ? 'center top' : 'left center') : ponta ? (v ? 'center bottom' : 'right center') : 'center';
  const e = (x, y) => (v ? `${y} ${x}` : `${x} ${y}`);
  lente.animate(ponta
    ? [{ scale: '1 1' }, { scale: e(1.1, 0.92), offset: 0.22 }, { scale: e(0.84, 1.07), offset: 0.55 }, { scale: e(1.03, 0.99), offset: 0.8 }, { scale: '1 1' }]
    : [{ scale: '1 1' }, { scale: e(1.14, 0.9), offset: 0.35 }, { scale: '1 1' }], { duration: ponta ? 520 : 420, easing: 'ease-out' });
}
function vaiPara(n) {
  abreMenu(false);
  if (emSub) { emSub = false; $('tela-sub').hidden = true; TELAS[3].hidden = false; }
  if (n === tela) { if (n === 1) pintaLista(); topo(); return rolaTopo(); }
  const t = TELAS[n];
  TELAS[tela].hidden = true;
  t.style.setProperty('--dir', n > tela ? 1 : -1);
  tela = n;
  t.hidden = false;
  anima(t, 'entra');
  rolagem.scrollTop = 0;
  botoesAba.forEach((b, i) => (i === n ? b.setAttribute('aria-current', 'page') : b.removeAttribute('aria-current')));
  moveLente(n); topo();
  if (n === 1) pintaLista();
  if (n === 2) { const g = $('grafico'); g.classList.remove('desenha'); void g.getBoundingClientRect(); g.classList.add('desenha'); }
}
botoesAba.forEach((b, n) => b.addEventListener('click', () => vaiPara(n)));
$('ver-todos').addEventListener('click', (e) => { e.preventDefault(); filtro = null; extrato = 0; vaiPara(1); });
$('ver-fatura').addEventListener('click', (e) => { e.preventDefault(); filtro = null; extrato = 1; vaiPara(1); });

/* subtelas de Ajustes: empurram da direita, voltam pelo botão */
const SUBS = { cartoes: 'Cartões', vr: 'Vale-refeição', banco: 'Banco', applepay: 'Apple Pay', atalho: 'Atalho do iPhone' };
function abreSub(k) {
  const t = $('tela-sub');
  emSub = true; TELAS[3].hidden = true;
  $('sub-titulo').textContent = SUBS[k];
  $('sub-corpo').replaceChildren($('sub-' + k).content.cloneNode(true));
  desenhaTudo(t); registra(t);
  if (k === 'vr') poe($('sub-vr-saldo'), 'R$ ' + brl(X.vr));
  t.hidden = false; anima(t, 'empurra'); rolagem.scrollTop = 0; topo();
}
$('voltar').addEventListener('click', () => { emSub = false; $('tela-sub').hidden = true; TELAS[3].hidden = false; TELAS[3].style.setProperty('--dir', -1); anima(TELAS[3], 'entra'); topo(); });

/* um gasto novo entra em tudo: saldo, categoria, extrato e últimos */
function repinta(de, nova) {
  const N = MESES.nov;
  if (mes !== 'nov') { mes = 'nov'; M = N; pintaMes(); }
  poe($('saiu'), reais(N.saiu)); poe($('investiu'), reais(N.investiu));
  poe($('depois'), 'R$ ' + brl(N.sobrou - X.fatura));
  poe($('vrsaldo'), 'R$ ' + brl(X.vr));
  poe($('aberta'), 'R$ ' + brl(N.lanc.credito.reduce((s, x) => s + gasto(x), 0)));
  contar(sobrou, de, N.sobrou);
  pintaNivel(); pintaCats(); pintaUltimos(nova); pintaLista();
}
function registraGasto(nome, k, v, forma, dia, extra) {
  const N = MESES.nov, r = [dia, nome, k, -v, extra], aba = forma === 'Crédito' ? 'credito' : forma === 'VR' ? 'vr' : 'debito', de = N.sobrou;
  if (CATS.includes(k)) N.cats[k] += v;
  N.ultimos.unshift(r); N.lanc[aba].unshift(r);
  if (aba === 'vr') X.vr -= v;
  else if (aba === 'debito') { N.sobrou -= v; if (k === 'investe') N.investiu += v; else N.saiu += v; }
  repinta(de, true);
}
function removeGasto(r, aba) {
  const N = MESES.nov, v = -r[3], u = N.ultimos.findIndex((x) => x[1] === r[1] && x[3] === r[3]);
  N.cats[r[2]] -= v;
  N.lanc[aba].splice(N.lanc[aba].indexOf(r), 1);
  if (u >= 0) N.ultimos.splice(u, 1);
  if (aba === 'vr') X.vr += v; else if (aba === 'debito') { N.sobrou += v; N.saiu -= v; }
}

/* para conferir */
function saiConferir() {
  const c = $('conferir'), fim = () => c.remove();
  if (calmo.matches) return fim();
  c.style.overflow = 'hidden';
  c.animate([{ height: c.offsetHeight + 'px', opacity: 1 }, { height: '0px', opacity: 0, paddingBlock: '0px', marginBottom: '-12px' }], { duration: 360, easing: 'cubic-bezier(.3,.7,.2,1)' }).onfinish = fim;
}
$('ignorar').addEventListener('click', saiConferir);
$('confirmar').addEventListener('click', () => { saiConferir(); registraGasto('Padaria Real', 'alimentacao', 1840, 'Débito', 'Ontem', 'conferido no banco'); });

/* folha: uma só, com campos que aparecem conforme o que se está fazendo */
const folha = $('folha'), fvalor = $('fvalor');
const OPCIONAIS = ['f-nome', 'chips', 'formas', 'f-quando', 'f-tipo', 'f-cdi', 'f-apagar'];
const MODOS = {
  novo: { titulo: 'Novo gasto', mostra: ['f-nome', 'chips', 'formas'], acao: 'Lançar gasto' },
  editar: { titulo: 'Editar gasto', mostra: ['f-nome', 'chips', 'formas', 'f-quando', 'f-apagar'], acao: 'Salvar' },
  valor: { mostra: [] },
  investimento: { titulo: 'Novo investimento', mostra: ['f-nome', 'f-tipo', 'f-cdi'], acao: 'Guardar investimento' },
};
let F = MODOS.novo, valor = 0, catSel = 1, formaSel = 0;
const poePasso = (caixa, n) => { caixa.dataset.v = n; caixa.querySelector('output').textContent = n + (caixa.dataset.suf || ''); };
function pintaFolha() {
  fvalor.textContent = 'R$ ' + brl(valor);
  fvalor.classList.toggle('vazio', valor === 0);
  $('lancar').disabled = valor === 0;
  $('chips').querySelectorAll('button').forEach((b, n) => b.setAttribute('aria-pressed', n === catSel));
  $('formas').querySelectorAll('button').forEach((b, n) => b.setAttribute('aria-pressed', n === formaSel));
  const n = Number($('f-vezes').dataset.v);
  $('f-parcelas').hidden = !(F.mostra.includes('formas') && formaSel === 2);
  $('f-parcela-txt').textContent = n === 1 ? 'À vista, na fatura aberta' : `${n}x de R$ ${brl(Math.ceil(valor / n))}`;
}
function abreFolha(modo, op = {}) {
  F = { ...MODOS[modo], modo, ...op };
  valor = Math.abs(op.valor || 0);
  OPCIONAIS.forEach((id) => ($(id).hidden = !F.mostra.includes(id)));
  $('f-titulo').textContent = F.titulo; $('lancar').textContent = F.acao; folha.setAttribute('aria-label', F.titulo);
  $('f-nome').value = '';
  $('f-nome').placeholder = modo === 'investimento' ? 'Nome, como CDB C6' : 'Com o quê? (opcional)';
  poePasso($('f-vezes'), 1);
  if (modo === 'editar') { const r = op.linha; $('f-nome').value = r[1]; catSel = CATS.indexOf(r[2]); formaSel = { debito: 0, credito: 2, vr: 3 }[op.aba]; valor = -r[3]; }
  pintaFolha();
  folha.inert = false; iphone.classList.add('com-folha');
  $('teclado').querySelector('button').focus({ preventScroll: true });
}
function fechaFolha() { iphone.classList.remove('com-folha'); folha.inert = true; }
$('chips').innerHTML = CATS.map((k) => `<button class="chip pressiona"><span class="ponto" style="background:var(--cat-${k})"></span>${META[k].nome}</button>`).join('');
$('formas').innerHTML = FORMAS.map((f) => `<button>${f}</button>`).join('');
$('teclado').innerHTML = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '00', '0', 'apaga'].map((t) =>
  t === 'apaga' ? `<button class="pressiona" data-t="apaga" aria-label="Apagar dígito"><svg class="i" data-i="apaga"></svg></button>` : `<button class="pressiona" data-t="${t}">${t}</button>`).join('');
$('chips').querySelectorAll('button').forEach((b, n) => b.addEventListener('click', () => { catSel = n; pintaFolha(); }));
$('formas').querySelectorAll('button').forEach((b, n) => b.addEventListener('click', () => { formaSel = n; pintaFolha(); }));
const tecla = (t) => {
  const v = t === 'apaga' ? Math.floor(valor / 10) : t === '00' ? valor * 100 : valor * 10 + Number(t);
  if (v <= 9999999) valor = v;
  pintaFolha();
};
$('teclado').querySelectorAll('button').forEach((b) => b.addEventListener('click', () => tecla(b.dataset.t)));
$('mais').addEventListener('click', () => abreFolha('novo'));
$('novo-inv').addEventListener('click', () => abreFolha('investimento'));
$('fechar').addEventListener('click', fechaFolha);
$('veu').addEventListener('click', fechaFolha);
addEventListener('keydown', (e) => {
  if (e.key === 'Escape') abreMenu(false);
  if (!iphone.classList.contains('com-folha')) return;
  if (e.key === 'Escape') return fechaFolha();
  if (e.target.tagName === 'INPUT') return;
  if (/^\d$/.test(e.key)) tecla(e.key);
  else if (e.key === 'Backspace') tecla('apaga');
});
$('f-apagar').addEventListener('click', () => { const de = MESES.nov.sobrou; fechaFolha(); removeGasto(F.linha, F.aba); repinta(de); });
$('lancar').addEventListener('click', () => {
  const k = CATS[catSel], forma = FORMAS[formaSel], nome = $('f-nome').value.trim(), n = Number($('f-vezes').dataset.v), v = valor;
  fechaFolha();
  if (F.modo === 'valor') return F.ok(v);
  if (F.modo === 'investimento') {
    const tipo = $('f-tipo').querySelector('[aria-pressed="true"]').textContent, cdi = $('f-cdi-passo').dataset.v;
    INV.push({ nome: nome || tipo, taxa: `${cdi}% do CDI` + (tipo === 'CDB' ? '' : ', sem IR'), valor: v, aportado: v, mesR: 0, ir: tipo === 'CDB' });
    registraGasto('Aporte ' + (nome || tipo), 'investe', v, 'Débito', 'Agora');
    return pintaInv();
  }
  const parcelado = forma === 'Crédito' && n > 1, vv = parcelado ? Math.ceil(v / n) : v, extra = parcelado ? `parcela 1 de ${n}` : forma;
  if (F.modo === 'editar') {
    const quando = $('f-quando').querySelector('[aria-pressed="true"]').textContent;
    removeGasto(F.linha, F.aba);
    return registraGasto(nome || META[k].nome, k, vv, forma, quando === 'Hoje' ? F.linha[0] : quando, extra);
  }
  registraGasto(nome || META[k].nome, k, vv, forma, 'Agora', extra);
  if (tela === 0) rolaTopo(forma === 'Débito' || forma === 'Pix' ? 0 : 200);
  else if (tela === 1) { extrato = forma === 'Crédito' ? 1 : forma === 'VR' ? 2 : 0; filtro = null; pintaLista(); rolaTopo(); }
});

/* controles genéricos, por delegação: passo, escolha, interruptor, ações e subtelas */
const ACOES = {
  buscar(a) { a.disabled = true; a.textContent = 'Buscando…'; setTimeout(() => { a.disabled = false; a.textContent = 'Buscar agora'; a.closest('.cartao').querySelector('[data-status]').textContent = 'Buscou agora mesmo. Nada novo.'; }, 1200); },
  token(a) { const t = a.closest('.cartao').querySelector('.token'); t.hidden = false; anima(t, 'chega'); },
  cartao(a) { const c = a.previousElementSibling.cloneNode(true); c.querySelector('h2').textContent = 'Cartão novo'; c.querySelector('.selo-bom').remove(); a.before(c); anima(c, 'chega'); },
  'saldo-vr'() { abreFolha('valor', { titulo: 'Saldo do VR hoje', acao: 'Corrigir saldo', valor: X.vr, ok: (x) => { X.vr = x; poe($('sub-vr-saldo'), 'R$ ' + brl(x)); repinta(MESES.nov.sobrou); } }); },
  aportar(a) { const v = INV[a.dataset.n]; abreFolha('valor', { titulo: 'Aportar em ' + v.nome, acao: 'Aportar', ok: (x) => { v.valor += x; v.aportado += x; registraGasto('Aporte ' + v.nome, 'investe', x, 'Débito', 'Agora'); pintaInv(); } }); },
  ajustar(a) { const v = INV[a.dataset.n]; abreFolha('valor', { titulo: 'Quanto o banco mostra?', acao: 'Ajustar valor', valor: v.valor, ok: (x) => { v.valor = x; pintaInv(); } }); },
};
iphone.addEventListener('click', (e) => {
  if (!menu.contains(e.target)) abreMenu(false);
  const p = e.target.closest('.passo button');
  if (p) {
    const caixa = p.parentElement, n = Math.max(Number(caixa.dataset.min), Math.min(Number(caixa.dataset.max), Number(caixa.dataset.v) + Number(p.dataset.d)));
    poePasso(caixa, n);
    if (!calmo.matches) caixa.querySelector('output').animate([{ scale: 1.25 }, { scale: 1 }], { duration: 260, easing: 'ease-out' });
    if (folha.contains(caixa)) pintaFolha();
    return;
  }
  const s = e.target.closest('.seg[data-escolha] button');
  if (s) return s.parentElement.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', b === s));
  const i = e.target.closest('[role="switch"]');
  if (i && i.id !== 'sw-tema') return i.setAttribute('aria-checked', i.getAttribute('aria-checked') !== 'true');
  const a = e.target.closest('[data-acao]');
  if (a) return ACOES[a.dataset.acao](a);
  const sub = e.target.closest('[data-sub]');
  if (sub) abreSub(sub.dataset.sub);
});

/* entrar e sair */
$('sair').addEventListener('click', () => { $('tela-entrar').hidden = false; });
$('form-entrar').addEventListener('submit', (e) => { e.preventDefault(); $('tela-entrar').hidden = true; vaiPara(0); abrir(); });

/* tema e aparelho */
function tema(t) {
  document.documentElement.dataset.theme = t;
  document.querySelectorAll('[data-tema]').forEach((o) => o.setAttribute('aria-pressed', o.dataset.tema === t));
  $('sw-tema').setAttribute('aria-checked', t === 'dark');
}
document.querySelectorAll('[data-tema]').forEach((b) => b.addEventListener('click', () => tema(b.dataset.tema)));
$('sw-tema').addEventListener('click', () => tema(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'));
function cabe() {
  const largura = document.querySelector('.pagina').clientWidth;
  iphone.style.zoom = mac() ? Math.min(1, (largura - 56) / 1180) : Math.min(1, (largura - 72) / 393, (innerHeight - 48) / 852);
}
function forma(f) {
  iphone.dataset.forma = f;
  document.querySelectorAll('[data-forma-botao]').forEach((o) => o.setAttribute('aria-pressed', o.dataset.formaBotao === f));
  cabe(); moveLente(tela, true); topo();
}
document.querySelectorAll('[data-forma-botao]').forEach((b) => b.addEventListener('click', () => forma(b.dataset.formaBotao)));
addEventListener('resize', cabe);
$('repetir').addEventListener('click', () => { vaiPara(0); abrir(); });

desenhaTudo(document);
registra(iphone);
pintaInv();
pintaMes();
forma(new URLSearchParams(location.search).get('forma') === 'mac' || location.hash === '#mac' ? 'mac' : 'iphone');
requestAnimationFrame(abrir);
