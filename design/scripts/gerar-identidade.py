"""Gera as três direções de identidade (proposta) como cards do Design System.

Cada card: símbolo e ícone do app, paleta, tipografia, voz e o Início nessa pele.
As cores semânticas (gasto, receita, investimento) não mudam entre as direções.
Uso: python3 design/scripts/gerar-identidade.py
"""
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent / "project" / "components"
FONTES = ('<link rel="preconnect" href="https://fonts.googleapis.com">'
          '<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700'
          '&family=Unbounded:wght@600;700;800&family=Manrope:wght@500;600;700;800&display=swap" rel="stylesheet">')

ESTILO = """
<style>
.id { display:grid; grid-template-columns: 260px 1fr 300px; gap:28px; padding:24px; font-family: Manrope, system-ui, sans-serif; color:#0c1220; background:#fff; }
.id h3 { margin:0 0 4px; font: 800 13px/18px Manrope, sans-serif; letter-spacing:.04em; text-transform:uppercase; color:#556074; }
.id p { margin:0; }
.id .bloco { display:grid; gap:10px; align-content:start; }
.id .icone { width:132px; height:132px; border-radius:30px; overflow:hidden; box-shadow: 0 6px 20px rgba(12,18,32,.18); }
.id .icone svg { display:block; width:100%; height:100%; }
.id .home { display:flex; gap:14px; align-items:flex-end; }
.id .home .mini { width:60px; height:60px; border-radius:14px; overflow:hidden; box-shadow: 0 3px 10px rgba(12,18,32,.16); }
.id .home .rotulo { font: 600 11px/14px -apple-system, system-ui, sans-serif; color:#556074; text-align:center; margin-top:4px; }
.id .paleta { display:grid; grid-template-columns: repeat(4, 1fr); gap:8px; }
.id .cor { border-radius:12px; height:64px; padding:8px; display:flex; flex-direction:column; justify-content:flex-end; font: 700 11px/14px Manrope, sans-serif; }
.id .cor small { font-weight:600; opacity:.8; }
.id .semantica { display:flex; gap:6px; font: 700 12px/16px Manrope, sans-serif; }
.id .semantica span { padding:4px 8px; border-radius:999px; }
.id .tipo { border-radius:14px; background:#f3f5f9; padding:14px; display:grid; gap:4px; }
.id .voz { font: 600 13px/19px Manrope, sans-serif; color:#3a4456; display:grid; gap:6px; }
.id .voz b { color:#0c1220; }
.id .tela { width:300px; height:560px; border-radius:40px; overflow:hidden; position:relative; box-shadow: 0 0 0 8px #0c1220, 0 12px 30px rgba(12,18,32,.25); }
</style>
"""

SEMANTICA = ('<div class="semantica"><span style="background:#fce8dd;color:#b93e0b">− R$ 32,90</span>'
             '<span style="background:#dcf4e8;color:#06784c">+ R$ 8.500</span>'
             '<span style="background:#faefd6;color:#855700">▲ 8,0%</span></div>'
             '<p style="font:600 12px/16px Manrope;color:#556074">Gasto, receita e investimento ficam iguais nas três (validados para daltonismo).</p>')


def cor(fundo, nome, uso, texto="#fff"):
    return f'<div class="cor" style="background:{fundo};color:{texto}">{nome}<small>{uso}</small></div>'


def card(nome, titulo, simbolo, icone, wordmark, paleta, tipo, voz, tela):
    pasta = RAIZ / nome
    pasta.mkdir(parents=True, exist_ok=True)
    html = (f'<!-- @dsCard group="Identidade (proposta)" height=640 width=1180 subtitle="{titulo}" -->\n'
            f'{FONTES}{ESTILO}<div class="id">'
            f'<div class="bloco"><h3>Símbolo e ícone</h3>{wordmark}<div class="home"><div class="icone">{icone}</div>'
            f'<div><div class="mini">{icone}</div><div class="rotulo">{nome_curto(nome)}</div></div></div>{simbolo}</div>'
            f'<div class="bloco"><h3>Paleta</h3><div class="paleta">{paleta}</div>{SEMANTICA}'
            f'<h3 style="margin-top:8px">Tipografia</h3>{tipo}<h3 style="margin-top:8px">Voz</h3><div class="voz">{voz}</div></div>'
            f'<div class="bloco"><h3>Início</h3>{tela}</div>'
            '</div>\n')
    (pasta / "preview.html").write_text(html, encoding="utf-8")
    (pasta / "README.md").write_text(titulo + "\n", encoding="utf-8")


def nome_curto(nome):
    return {"IdentidadeBluefin": "BlueFin", "IdentidadeCaderneta": "BlueFinance", "IdentidadeCobalto": "BlueFinance"}[nome]


# ───────────────────────── A · Bluefin ─────────────────────────
FIN = 'M26 118 C 62 112 98 82 120 30 C 114 66 120 98 152 118 Z'
ONDA = 'M18 132 Q 42 120 66 132 T 114 132 T 162 132'
icone_a = ('<svg viewBox="0 0 180 180"><defs><linearGradient id="ga" x1="0" y1="0" x2="1" y2="1">'
           '<stop offset="0" stop-color="#0b1f4d"/><stop offset="1" stop-color="#1846c8"/></linearGradient></defs>'
           f'<rect width="180" height="180" fill="url(#ga)"/><path d="{FIN}" fill="#f3f7fb"/>'
           f'<path d="{ONDA}" fill="none" stroke="#3ccfc6" stroke-width="9" stroke-linecap="round"/></svg>')
wordmark_a = ('<p style="font:800 34px/1 Manrope;letter-spacing:-.03em;color:#0b1f4d">blue<span style="color:#1846c8">fin</span></p>'
              '<p style="font:600 13px/18px Manrope;color:#556074">Rápido como o atum-azul: lança em três toques.</p>')
simbolo_a = '<p style="font:600 12px/17px Manrope;color:#556074">A barbatana corta a linha d\'água: velocidade e “estar por dentro”. O nome no iPhone vira <b>BlueFin</b> (cabe sem cortar).</p>'
paleta_a = (cor("#0b1f4d", "Abismo", "títulos, ícone") + cor("#1846c8", "Atum", "ação principal")
            + cor("#3ccfc6", "Água", "destaques", "#0b1f4d") + cor("#eef4f8", "Espuma", "fundo", "#0b1f4d"))
tipo_a = ('<div class="tipo"><p style="font:800 28px/1.1 Manrope;letter-spacing:-.02em">Novembro</p>'
          '<p style="font:800 22px/1.2 Manrope;font-variant-numeric:tabular-nums">R$ 4.218,35</p>'
          '<p style="font:600 13px/18px Manrope;color:#556074">Manrope em tudo, mais pesada nos números. Simples e técnica.</p></div>')
voz_a = ('<p><b>Direta e ágil.</b> "Pronto: Uber no Nubank, fatura de dezembro."</p>'
         '<p>Vazio: "Nada lançado ainda. Aperte o Botão de Ação e vai."</p>')
tela_a = (
    '<div class="tela" style="background:#eef4f8">'
    '<div style="background:linear-gradient(160deg,#0b1f4d,#1846c8);color:#fff;padding:52px 20px 26px;position:relative">'
    '<p style="font:800 26px/1 Manrope;letter-spacing:-.02em">Novembro</p>'
    '<p style="margin-top:18px;font:600 12px Manrope;opacity:.8">Sobrou em novembro</p>'
    '<p style="font:800 34px/1.1 Manrope;font-variant-numeric:tabular-nums">R$ 4.218,35</p>'
    f'<svg viewBox="0 0 300 24" style="position:absolute;left:0;bottom:-1px;width:100%"><path d="M0 14 Q 25 4 50 14 T 100 14 T 150 14 T 200 14 T 250 14 T 300 14 V24 H0Z" fill="#eef4f8"/></svg></div>'
    '<div style="padding:14px 16px;display:grid;gap:10px">'
    '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px">'
    + "".join(f'<div style="background:#fff;border-radius:12px;padding:8px"><p style="font:600 10px Manrope;color:#556074">{r}</p><p style="font:800 14px Manrope">{v}</p></div>'
              for r, v in [("Entrou", "R$ 9.350"), ("Saiu", "R$ 3.632"), ("Investiu", "R$ 1.500")])
    + '</div><div style="background:#fff;border-radius:16px;padding:12px;display:grid;gap:8px">'
      '<p style="font:800 14px Manrope">Últimos</p>'
    + "".join(f'<div style="display:flex;justify-content:space-between;font:600 12px Manrope"><span>{t}</span><span style="color:#b93e0b;font-weight:800">{v}</span></div>'
              for t, v in [("Uber", "− R$ 18,40"), ("Mercado do bairro", "− R$ 32,90"), ("Almoço", "− R$ 41,00")])
    + '</div></div>'
    '<div style="position:absolute;left:0;right:0;bottom:0;height:70px;background:#fff;display:flex;justify-content:center">'
    '<div style="margin-top:-22px;width:56px;height:56px;border-radius:50%;background:#0b1f4d;display:grid;place-items:center;box-shadow:0 0 0 4px #3ccfc6">'
    '<span style="color:#fff;font:700 30px/1 Manrope">+</span></div></div></div>')
card("IdentidadeBluefin", "A · BlueFin — o atum-azul: rápido, azul profundo e água", simbolo_a, icone_a, wordmark_a, paleta_a, tipo_a, voz_a, tela_a)

# ───────────────────────── B · Caderneta ─────────────────────────
icone_b = ('<svg viewBox="0 0 180 180"><rect width="180" height="180" fill="#f6f1e7"/>'
           '<rect x="34" y="104" width="112" height="26" rx="6" fill="#f7d84a" transform="rotate(-4 90 117)"/>'
           '<text x="90" y="128" text-anchor="middle" font-family="Fraunces, serif" font-weight="700" font-size="128" fill="#1c2b4f">b</text>'
           '<line x1="0" y1="40" x2="180" y2="40" stroke="#e3d9c6" stroke-width="2"/></svg>')
wordmark_b = ('<p style="font:600 34px/1 Fraunces, serif;letter-spacing:-.01em;color:#1c2b4f">BlueFinance</p>'
              '<p style="font:600 13px/18px Manrope;color:#6b6457">Seu caderninho de contas, no bolso.</p>')
simbolo_b = '<p style="font:600 12px/17px Manrope;color:#556074">O “b” de tinta azul com uma passada de marca-texto: pessoal, à mão, como anotar gastos num caderno.</p>'
paleta_b = (cor("#1c2b4f", "Tinta", "texto e títulos") + cor("#2f4fd1", "Caneta", "ação principal")
            + cor("#f7d84a", "Marca-texto", "destaques", "#1c2b4f") + cor("#f6f1e7", "Papel", "fundo", "#1c2b4f"))
tipo_b = ('<div class="tipo" style="background:#f6f1e7"><p style="font:600 30px/1.1 Fraunces, serif;color:#1c2b4f">Novembro</p>'
          '<p style="font:600 24px/1.2 Fraunces, serif;font-variant-numeric:tabular-nums;color:#1c2b4f">R$ 4.218,35</p>'
          '<p style="font:600 13px/18px Manrope;color:#6b6457">Fraunces (serifada) em títulos e valores; Manrope no resto.</p></div>')
voz_b = ('<p><b>Calma e pessoal.</b> "Anotado: Uber, R$ 18,40 no Nubank."</p>'
         '<p>Vazio: "Página em branco. Que tal o primeiro gasto do mês?"</p>')
tela_b = (
    '<div class="tela" style="background:#f6f1e7;background-image:repeating-linear-gradient(#f6f1e7 0 31px,#e9e0cf 31px 32px)">'
    '<div style="padding:52px 20px 10px">'
    '<p style="font:600 30px/1 Fraunces, serif;color:#1c2b4f;display:inline;background:linear-gradient(transparent 58%,#f7d84a 58%)">Novembro</p></div>'
    '<div style="margin:6px 16px;background:#fffdf8;border:1px solid #e3d9c6;border-radius:18px;padding:14px">'
    '<p style="font:600 12px Manrope;color:#6b6457">Sobrou em novembro</p>'
    '<p style="font:600 32px/1.1 Fraunces, serif;color:#1c2b4f;font-variant-numeric:tabular-nums">R$ 4.218,35</p>'
    '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-top:10px">'
    + "".join(f'<div style="border-top:2px solid #1c2b4f;padding-top:6px"><p style="font:600 10px Manrope;color:#6b6457">{r}</p><p style="font:600 15px Fraunces, serif;color:#1c2b4f">{v}</p></div>'
              for r, v in [("Entrou", "R$ 9.350"), ("Saiu", "R$ 3.632"), ("Investiu", "R$ 1.500")])
    + '</div></div><div style="margin:10px 16px;background:#fffdf8;border:1px solid #e3d9c6;border-radius:18px;padding:12px;display:grid;gap:8px">'
      '<p style="font:600 16px Fraunces, serif;color:#1c2b4f">Últimos</p>'
    + "".join(f'<div style="display:flex;justify-content:space-between;font:600 12px Manrope;color:#1c2b4f"><span>{t}</span><span style="color:#b93e0b;font-weight:800">{v}</span></div>'
              for t, v in [("Uber", "− R$ 18,40"), ("Mercado do bairro", "− R$ 32,90"), ("Almoço", "− R$ 41,00")])
    + '</div>'
    '<div style="position:absolute;left:0;right:0;bottom:0;height:70px;background:#fffdf8;border-top:1px solid #e3d9c6;display:flex;justify-content:center">'
    '<div style="margin-top:-22px;width:56px;height:56px;border-radius:50%;background:#2f4fd1;display:grid;place-items:center">'
    '<span style="color:#fff;font:700 30px/1 Manrope">+</span></div></div></div>')
card("IdentidadeCaderneta", "B · Caderneta — papel, tinta azul e marca-texto", simbolo_b, icone_b, wordmark_b, paleta_b, tipo_b, voz_b, tela_b)

# ───────────────────────── C · Cobalto ─────────────────────────
B_PILULAS = ('<rect x="46" y="38" width="26" height="104" rx="13" fill="#d4ff3a"/>'
             '<rect x="46" y="38" width="80" height="46" rx="23" fill="#d4ff3a"/>'
             '<rect x="46" y="94" width="92" height="48" rx="24" fill="#d4ff3a"/>'
             '<rect x="72" y="56" width="34" height="10" rx="5" fill="#1f3cff"/>'
             '<rect x="72" y="113" width="44" height="10" rx="5" fill="#1f3cff"/>')
icone_c = f'<svg viewBox="0 0 180 180"><rect width="180" height="180" fill="#1f3cff"/>{B_PILULAS}</svg>'
wordmark_c = ('<p style="font:800 26px/1 Unbounded, sans-serif;letter-spacing:-.02em;color:#0a0f1f">bluefinance</p>'
              '<p style="font:600 13px/18px Manrope;color:#556074">Dinheiro sem drama.</p>')
simbolo_c = '<p style="font:600 12px/17px Manrope;color:#556074">O “B” montado com as pílulas da barra de gastos: evolução do ícone atual, mais forte e reconhecível.</p>'
paleta_c = (cor("#0a0f1f", "Noite", "texto e fundo escuro") + cor("#1f3cff", "Cobalto", "marca, topo do Início")
            + cor("#d4ff3a", "Lima", "botão + e destaques", "#0a0f1f") + cor("#f2f4ff", "Gelo", "fundo", "#0a0f1f"))
tipo_c = ('<div class="tipo"><p style="font:700 24px/1.1 Unbounded, sans-serif;letter-spacing:-.02em">Novembro</p>'
          '<p style="font:700 22px/1.2 Unbounded, sans-serif;font-variant-numeric:tabular-nums">R$ 4.218,35</p>'
          '<p style="font:600 13px/18px Manrope;color:#556074">Unbounded (larga e ousada) em títulos e no saldo; Manrope no resto.</p></div>')
voz_c = ('<p><b>Leve e confiante.</b> "Feito. R$ 18,40 de Uber, no crédito."</p>'
         '<p>Vazio: "Zerado por aqui. Bora lançar o primeiro?"</p>')
tela_c = (
    '<div class="tela" style="background:#f2f4ff">'
    '<div style="background:#1f3cff;color:#fff;padding:52px 20px 22px;border-radius:0 0 28px 28px">'
    '<p style="font:700 22px/1 Unbounded, sans-serif">Novembro</p>'
    '<p style="margin-top:18px;font:600 12px Manrope;opacity:.85">Sobrou em novembro</p>'
    '<p style="font:700 30px/1.15 Unbounded, sans-serif;font-variant-numeric:tabular-nums">R$ 4.218</p>'
    '<div style="display:flex;gap:6px;margin-top:12px">'
    + "".join(f'<span style="background:rgba(255,255,255,.14);border-radius:999px;padding:5px 9px;font:700 11px Manrope">{r} {v}</span>'
              for r, v in [("↙", "9.350"), ("↗", "3.632"), ("◆", "1.500")])
    + '</div></div><div style="margin:14px 16px;background:#fff;border-radius:20px;padding:12px;display:grid;gap:8px">'
      '<p style="font:700 13px Unbounded, sans-serif">Últimos</p>'
    + "".join(f'<div style="display:flex;justify-content:space-between;font:600 12px Manrope"><span>{t}</span><span style="color:#b93e0b;font-weight:800">{v}</span></div>'
              for t, v in [("Uber", "− R$ 18,40"), ("Mercado do bairro", "− R$ 32,90"), ("Almoço", "− R$ 41,00")])
    + '</div>'
    '<div style="position:absolute;left:0;right:0;bottom:0;height:70px;background:#0a0f1f;display:flex;justify-content:center">'
    '<div style="margin-top:-22px;width:58px;height:58px;border-radius:50%;background:#d4ff3a;display:grid;place-items:center">'
    '<span style="color:#0a0f1f;font:800 30px/1 Manrope">+</span></div></div></div>')
card("IdentidadeCobalto", "C · Cobalto — ousado, cobalto e lima", simbolo_c, icone_c, wordmark_c, paleta_c, tipo_c, voz_c, tela_c)

print("identidades geradas em", RAIZ)
