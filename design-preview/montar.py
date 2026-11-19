#!/usr/bin/env python3
"""Monta as páginas da prévia como arquivos únicos (CSS e JS embutidos), para abrir direto do disco.
Uso: python3 montar.py"""
from pathlib import Path

raiz = Path(__file__).parent
src = raiz / "src"
ler = lambda nome: (src / nome).read_text()

def pagina(titulo, corpo, scripts):
    js = "\n".join(ler(s) for s in scripts)
    return f"""<!doctype html>
<html lang="pt-BR" data-theme="dark">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{titulo}</title>
<style>
{ler("bluefin.css")}
</style>
</head>
<body>
{corpo}
<script>
{js}
</script>
</body>
</html>
"""

(raiz / "prototipo.html").write_text(pagina(
    "BlueFin, protótipo",
    ler("prototipo.html").replace("@@APARELHO@@", ler("aparelho.html")),
    ["bluefin.js", "dados.js", "prototipo.js"]))
if (src / "design-system.html").exists():
    (raiz / "design-system.html").write_text(pagina("BlueFin, Design System", ler("design-system.html"), ["bluefin.js", "design-system.js"]))
if (src / "index.html").exists():
    (raiz / "index.html").write_text(pagina("BlueFin, prévia de design", ler("index.html"), ["bluefin.js"]))
print("ok")
