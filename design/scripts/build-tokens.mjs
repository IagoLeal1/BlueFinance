// Gera design/project/tokens.css a partir de tokens.json e confere contraste (WCAG 2) nos dois temas.
// Uso: node design/scripts/build-tokens.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'project');
const t = JSON.parse(readFileSync(join(root, 'tokens.json'), 'utf8'));
const themes = t.color.themes.map((x) => x.id);
const first = themes[0];
const val = (tok, theme) => (typeof tok.value === 'string' ? tok.value : tok.value[theme] ?? tok.value[first]);

// ---------- tokens.css ----------
const lines = [`/* ${t.name} — generated from tokens.json */`];
for (const theme of themes) {
  const sel = theme === first ? `:root, [data-theme="${theme}"]` : `[data-theme="${theme}"]`;
  lines.push(`${sel} {`);
  for (const tok of t.color.tokens) lines.push(`  --${tok.name}: ${val(tok, theme)};`);
  for (const tok of t.shadow?.tokens ?? []) lines.push(`  --${tok.name}: ${val(tok, theme)};`);
  lines.push('}');
}
lines.push(':root {');
for (const fam of ['spacing', 'radius', 'size']) for (const tok of t[fam]?.tokens ?? []) lines.push(`  --${tok.name}: ${tok.value};`);
for (const [k, v] of Object.entries(t.type.families)) lines.push(`  --font-${k}: ${v};`);
lines.push('}');
for (const g of t.type.groups) {
  for (const s of g.styles) {
    const fam = s.family ?? g.family;
    lines.push(`.${s.name} { font-family: var(--font-${fam}); font-size: ${s.fontSize}; line-height: ${s.lineHeight}; font-weight: ${s.fontWeight};${s.letterSpacing ? ` letter-spacing: ${s.letterSpacing};` : ''} }`);
  }
}
writeFileSync(join(root, 'tokens.css'), lines.join('\n') + '\n');

// ---------- src/app/tokens.css (tema do app: Tailwind v4 + shadcn) ----------
// Cores e sombras viram variáveis por tema (o escuro segue o ajuste do iPhone);
// raios entram no @theme do Tailwind; cada cor vira utilitário (bg-surface, text-positive...).
const app = [`/* ${t.name} — generated from design/project/tokens.json by design/scripts/build-tokens.mjs */`, '', '@theme {'];
for (const tok of t.radius.tokens) app.push(`  --${tok.name}: ${tok.value};`);
app.push('}', '');
const vars = (theme, indent) => [
  ...t.color.tokens.map((tok) => `${indent}--${tok.name}: ${val(tok, theme)};`),
  ...(t.shadow?.tokens ?? []).map((tok) => `${indent}--bf-${tok.name}: ${val(tok, theme)};`),
];
app.push(':root {', `  color-scheme: ${themes[0]};`, ...vars(themes[0], '  '), '}', '');
for (const theme of themes.slice(1)) {
  app.push('@media (prefers-color-scheme: dark) {', '  :root {', `    color-scheme: ${theme};`, ...vars(theme, '    '), '  }', '}', '');
}
app.push('@theme inline {');
for (const tok of t.color.tokens) app.push(`  --color-${tok.name}: var(--${tok.name});`);
for (const tok of t.shadow?.tokens ?? []) app.push(`  --${tok.name}: var(--bf-${tok.name});`);
app.push('}');
writeFileSync(join(root, '..', '..', 'src', 'app', 'tokens.css'), app.join('\n') + '\n');

// ---------- contraste ----------
const hex = (h) => { h = h.replace('#', ''); if (h.length === 3) h = [...h].map((c) => c + c).join(''); return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255); };
const lum = (h) => { const [r, g, b] = hex(h).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
const byName = Object.fromEntries(t.color.tokens.map((x) => [x.name, x]));

// [texto, fundos, mínimo]
const pairs = [
  ['ink', ['bg', 'surface', 'surface-raised', 'surface-sunken'], 4.5],
  ['ink-muted', ['bg', 'surface', 'surface-raised', 'surface-sunken'], 4.5],
  ['brand', ['bg', 'surface', 'surface-raised'], 4.5],
  ['on-brand', ['brand', 'brand-pressed'], 4.5],
  ['on-brand-soft', ['brand-soft'], 4.5],
  ['positive', ['bg', 'surface', 'positive-soft'], 4.5],
  ['negative', ['bg', 'surface', 'surface-raised', 'negative-soft'], 4.5],
  ['invest', ['bg', 'surface', 'invest-soft'], 4.5],
  ['line-strong', ['surface', 'surface-raised', 'surface-sunken'], 3],
  ['focus', ['bg', 'surface', 'surface-raised', 'surface-sunken'], 3],
  ['chart-1', ['surface'], 3], ['chart-2', ['surface'], 3], ['chart-6', ['surface'], 3],
];
let fails = 0;
for (const theme of themes) {
  console.log(`\n== ${theme} ==`);
  for (const [fg, bgs, min] of pairs) for (const bgName of bgs) {
    const r = ratio(val(byName[fg], theme), val(byName[bgName], theme));
    const ok = r >= min; if (!ok) fails++;
    console.log(`${ok ? 'ok  ' : 'FAIL'} ${fg.padEnd(14)} on ${bgName.padEnd(15)} ${r.toFixed(2)} (min ${min})`);
  }
}
console.log(fails ? `\n${fails} par(es) abaixo do mínimo` : '\nTodos os pares passam.');
process.exitCode = fails ? 1 : 0;
