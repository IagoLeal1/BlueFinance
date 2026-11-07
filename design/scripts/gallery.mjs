// Gera design/gallery/ para revisar os previews localmente (claro e escuro lado a lado).
// Uso: node design/scripts/gallery.mjs && python3 -m http.server 5179 -d design
import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const base = join(dirname(fileURLToPath(import.meta.url)), '..');
const comps = join(base, 'project', 'components');
const out = join(base, 'gallery');
mkdirSync(out, { recursive: true });
const names = readdirSync(comps).filter((n) => existsSync(join(comps, n, 'preview.html')));
const cards = [];
for (const n of names) {
  const src = readFileSync(join(comps, n, 'preview.html'), 'utf8');
  const h = Number(/height=(\d+)/.exec(src)?.[1] ?? 120);
  const w = Number(/width=(\d+)/.exec(src)?.[1] ?? 0);
  for (const theme of ['light', 'dark']) {
    writeFileSync(join(out, `${n}-${theme}.html`), `<!doctype html><html data-theme="${theme}"><head><meta charset="utf-8"><link rel="stylesheet" href="../project/tokens.css"><link rel="stylesheet" href="../project/components/bundle.css"></head><body>${src}</body></html>`);
  }
  cards.push(`<section><h2>${n}</h2><div class="row">${['light', 'dark'].map((t) => `<iframe src="${n}-${t}.html" style="height:${h + 24}px;${w ? `width:${w}px` : ''}"></iframe>`).join('')}</div></section>`);
}
writeFileSync(join(out, 'index.html'), `<!doctype html><meta charset="utf-8"><title>BlueFinance — galeria</title><style>body{font:14px system-ui;margin:24px;background:#ddd}h2{margin:24px 0 8px}.row{display:flex;gap:16px;flex-wrap:wrap}iframe{border:0;width:460px;background:#fff;border-radius:8px}</style>${cards.join('')}`);
console.log(`${names.length} previews`);
