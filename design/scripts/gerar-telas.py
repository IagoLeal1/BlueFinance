#!/usr/bin/env python3
"""Gera as telas de exemplo do design kit (design/project/components/Tela*/preview.html).

Uso: python3 design/scripts/gerar-telas.py
Cada tela é um iPhone 16 (393 × 852) montado só com as classes de bundle.css.
"""
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent / "project" / "components"
ICONES = ('<script>(function(){var s=document.createElement("script");'
          's.src="https://unpkg.com/lucide@0.469.0/dist/umd/lucide.min.js";'
          's.onload=function(){lucide.createIcons()};document.head.appendChild(s);})();</script>')


def i(nome, extra="", cls=""):
    return f'<i data-lucide="{nome}" class="bf-icon {cls}"{extra}></i>'


STATUS = ('<div class="bf-phone__island"></div><div class="bf-phone__status"><span>9:41</span>'
          '<span style="display:flex;gap:6px">'
          + i("signal", ' style="width:18px;height:18px"') + i("wifi", ' style="width:18px;height:18px"')
          + i("battery-full", ' style="width:22px;height:18px"') + '</span></div>')


def tabbar(ativa):
    abas = [("house", "Início"), ("receipt", "Lançamentos"), None, ("trending-up", "Investir"), ("settings", "Ajustes")]
    out = ['<nav class="bf-tabbar" aria-label="Principal">']
    for n, aba in enumerate(abas):
        if aba is None:
            out.append(f'<button class="bf-fab" aria-label="Novo lançamento">{i("plus")}</button>')
            continue
        atual = ' aria-current="page"' if n == ativa else ""
        out.append(f'<button class="bf-tab"{atual}>{i(aba[0])}{aba[1]}</button>')
    out.append("</nav>")
    return "".join(out)


def linha(tipo, icone, titulo, meta, valor, extra=""):
    cor = {"despesa": "is-negative", "receita": "is-positive", "investimento": "is-invest"}[tipo]
    tile = {"despesa": "bf-cat--expense", "receita": "bf-cat--income", "investimento": "bf-cat--invest"}[tipo]
    return (f'<li class="bf-row{extra}"><span class="bf-cat {tile}">{i(icone)}</span>'
            f'<div class="bf-row__main"><div class="bf-row__title">{titulo}</div><div class="bf-row__meta">{meta}</div></div>'
            f'<span class="bf-row__amount {cor}">{valor}</span></li>')


ONDA_HERO = ('<svg class="bf-hero__onda" viewBox="0 0 300 24" preserveAspectRatio="none" aria-hidden="true">'
             '<path d="M0 14 Q 25 4 50 14 T 100 14 T 150 14 T 200 14 T 250 14 T 300 14 V24 H0Z" fill="currentColor"/></svg>')


def topo_inicio(sobrou, entrou, saiu, investiu, mes="novembro", trocar_mes=True):
    """Topo do Início na identidade BlueFin: título e saldo no degradê, linha d'água, e os três totais abaixo."""
    seta_in, seta_out, porco = i("arrow-down-left", cls="is-positive"), i("arrow-up-right", cls="is-negative"), i("piggy-bank", cls="is-invest")
    acao = f'<button class="bf-iconbtn" aria-label="Trocar mês">{i("calendar")}</button>' if trocar_mes else ""
    return (f'<section class="bf-hero" aria-label="Resumo de {mes}">{titulo(mes.capitalize(), acao)}'
            f'<div class="bf-hero__label">Sobrou em {mes}</div><div class="bf-hero__value">{sobrou}</div>{ONDA_HERO}</section>'
            '<div class="bf-stats">'
            f'<div class="bf-stat"><div class="bf-stat__label">{seta_in}Entrou</div><div class="bf-stat__value">{entrou}</div></div>'
            f'<div class="bf-stat"><div class="bf-stat__label">{seta_out}Saiu</div><div class="bf-stat__value">{saiu}</div></div>'
            f'<div class="bf-stat"><div class="bf-stat__label">{porco}Investiu</div><div class="bf-stat__value">{investiu}</div></div>'
            '</div>')


def resumo(sobrou, entrou, saiu, investiu, mes="novembro"):
    seta_in, seta_out, porco = i("arrow-down-left", cls="is-positive"), i("arrow-up-right", cls="is-negative"), i("piggy-bank", cls="is-invest")
    return (f'<section class="bf-card bf-balance" aria-label="Resumo de {mes}">'
            f'<div class="bf-balance__label">Sobrou em {mes}</div><div class="bf-balance__value">{sobrou}</div>'
            '<div class="bf-balance__split">'
            f'<div class="bf-stat"><div class="bf-stat__label">{seta_in}Entrou</div><div class="bf-stat__value">{entrou}</div></div>'
            f'<div class="bf-stat"><div class="bf-stat__label">{seta_out}Saiu</div><div class="bf-stat__value">{saiu}</div></div>'
            f'<div class="bf-stat"><div class="bf-stat__label">{porco}Investiu</div><div class="bf-stat__value">{investiu}</div></div>'
            '</div></section>')


def chips(itens, marcado=None):
    return '<div class="bf-chips">' + "".join(
        f'<button class="bf-chip" aria-pressed="{"true" if nome == marcado else "false"}">{i(ic)}{nome}</button>'
        for ic, nome in itens) + "</div>"


CATS = [("house", "Moradia"), ("shopping-cart", "Mercado"), ("car", "Transporte"), ("utensils", "Alimentação"), ("ticket", "Lazer"), ("heart-pulse", "Saúde"), ("circle-ellipsis", "Outros")]


def tela(nome, subtitulo, corpo, readme, altura=900, largura=None):
    pasta = RAIZ / nome
    pasta.mkdir(parents=True, exist_ok=True)
    w = f" width={largura}" if largura else ""
    (pasta / "preview.html").write_text(
        f'<!-- @dsCard group="Telas" height={altura}{w} subtitle="{subtitulo}" -->\n{corpo}\n{ICONES}\n', encoding="utf-8")
    (pasta / "README.md").write_text(readme.strip() + "\n", encoding="utf-8")


def iphone(miolo, aba=None, sobre=""):
    tab = tabbar(aba) if aba is not None else ""
    hero = " bf-phone--hero" if 'class="bf-hero"' in miolo else ""
    return f'<div class="bf-phone{hero}">{STATUS}<div class="bf-phone__body">{miolo}</div>{tab}{sobre}</div>'


titulo = lambda t, acao="": f'<div style="display:flex;justify-content:space-between;align-items:center"><h1 class="bf-screen-title">{t}</h1>{acao}</div>'

# 1 · Entrar
tela("TelaEntrar", "1 · Entrar com e-mail e senha",
     iphone('<div style="flex:1;display:flex;flex-direction:column;justify-content:center;gap:32px">'
            '<div><div class="title">BlueFinance</div><div class="caption muted">Suas finanças em um toque.</div></div>'
            '<div style="display:grid;gap:16px">'
            '<label class="bf-field"><span class="bf-field__label">E-mail</span><input class="bf-input" value="voce@email.com"></label>'
            '<label class="bf-field"><span class="bf-field__label">Senha</span><input class="bf-input" type="password" value="••••••••••"></label>'
            f'<button class="bf-btn bf-btn--primary bf-btn--block" style="margin-top:8px">Entrar</button></div></div>'),
     """Tela de entrada: e-mail e senha, um único botão. Erro aparece acima do botão em `negative` ("E-mail ou senha incorretos.").
Não há cadastro aberto: a conta é criada uma vez no painel.""")

# 2 · Início
gastos = ('<section class="bf-card" aria-label="Gastos por categoria"><div class="bf-card__head"><h3 class="bf-card__title">Gastos por categoria</h3><a class="bf-link" href="#">Ver tudo</a></div>'
          '<div class="bf-spend__bar"><span class="bf-spend__seg" style="flex:44;background:var(--chart-1)"></span><span class="bf-spend__seg" style="flex:21;background:var(--chart-2)"></span><span class="bf-spend__seg" style="flex:12;background:var(--chart-3)"></span><span class="bf-spend__seg" style="flex:23;background:var(--chart-other)"></span></div>'
          '<ul class="bf-spend__legend">'
          '<li class="bf-spend__item"><span class="bf-spend__dot" style="background:var(--chart-1)"></span>Moradia<span class="bf-spend__val">R$ 1.600,00</span><span class="bf-spend__pct">44%</span></li>'
          '<li class="bf-spend__item"><span class="bf-spend__dot" style="background:var(--chart-2)"></span>Mercado<span class="bf-spend__val">R$ 762,40</span><span class="bf-spend__pct">21%</span></li>'
          '<li class="bf-spend__item"><span class="bf-spend__dot" style="background:var(--chart-3)"></span>Transporte<span class="bf-spend__val">R$ 436,10</span><span class="bf-spend__pct">12%</span></li>'
          '</ul></section>')
ultimos = ('<section class="bf-card" style="padding-top:8px;padding-bottom:4px"><div class="bf-card__head" style="margin:0"><h3 class="bf-card__title">Últimos</h3><a class="bf-link" href="#">Ver todos</a></div><ul class="bf-list">'
           + linha("despesa", "shopping-cart", "Mercado do bairro", "Hoje · Mercado", "− R$ 32,90")
           + linha("receita", "briefcase", "Salário de novembro", "5 nov · Salário", "+ R$ 8.500,00")
           + "</ul></section>")
tela("TelaInicio", "2 · Início: resumo do mês, gastos por categoria, últimos lançamentos",
     iphone(topo_inicio("R$ 4.218,35", "R$ 9.350", "R$ 3.632", "R$ 1.500") + gastos + ultimos, aba=0),
     """Início: o mês em uma olhada. Título é o mês; o botão de calendário troca o mês (ver meses anteriores).
"Últimos" mostra os 3 lançamentos mais recentes e leva para Lançamentos.""")

# 3 · Início vazio
tela("TelaInicioVazio", "3 · Início sem lançamentos: o que fazer primeiro",
     iphone(topo_inicio("R$ 0,00", "R$ 0", "R$ 0", "R$ 0", trocar_mes=False)
            + f'<section class="bf-card" style="text-align:center;display:grid;gap:8px;justify-items:center;padding:24px">'
              f'<span class="bf-cat bf-cat--neutral" style="width:48px;height:48px">{i("sparkles")}</span>'
              '<div class="body-strong">Nenhum lançamento ainda.</div>'
              '<div class="caption muted">Toque em + ou aperte o Botão de Ação do iPhone para lançar sem abrir o app.</div>'
              '<a class="bf-link" href="#" style="margin-top:4px">Como configurar o Botão de Ação</a></section>', aba=0),
     """Estado vazio: o resumo aparece zerado (nunca some) e um card explica os dois jeitos de lançar.
O link leva para Ajustes › Atalho do iPhone.""")

# 4 · Carregando
sk = lambda w, h, r=8: f'<div class="bf-skel" style="width:{w};height:{h}px;border-radius:{r}px"></div>'
tela("TelaCarregando", "4 · Carregando: esqueleto no lugar do texto",
     iphone(titulo("Novembro")
            + f'<section class="bf-card bf-balance" style="display:grid;gap:10px">{sk("40%", 14)}{sk("70%", 40)}'
              f'<div class="bf-balance__split">{sk("100%", 56, 14)}{sk("100%", 56, 14)}{sk("100%", 56, 14)}</div></section>'
            + f'<section class="bf-card" style="display:grid;gap:12px">{sk("55%", 18)}{sk("100%", 14, 4)}{sk("90%", 14)}{sk("80%", 14)}{sk("85%", 14)}</section>'
            + '<section class="bf-card" style="display:grid;gap:14px">'
            + "".join(f'<div style="display:flex;gap:12px;align-items:center">{sk("40px", 40, 12)}<div style="flex:1;display:grid;gap:6px">{sk("70%", 14)}{sk("40%", 12)}</div>{sk("72px", 14)}</div>' for _ in range(3))
            + "</section>", aba=0),
     """Carregando: o esqueleto tem o mesmo formato do conteúdo final, então nada "pula" quando os dados chegam.
O brilho que passa respeita "Reduzir movimento" do iPhone (fica parado). A barra de abas nunca espera.""")

# 5 · Lançamentos
tela("TelaLancamentos", "5 · Lançamentos: filtro e lista por dia",
     iphone(titulo("Lançamentos", f'<button class="bf-iconbtn" aria-label="Trocar mês">{i("calendar")}</button>')
            + '<div class="bf-seg" role="radiogroup" aria-label="Filtro"><button class="bf-seg__opt" role="radio" aria-checked="true">Tudo</button><button class="bf-seg__opt" role="radio" aria-checked="false">Saiu</button><button class="bf-seg__opt" role="radio" aria-checked="false">Entrou</button><button class="bf-seg__opt" role="radio" aria-checked="false">Investiu</button></div>'
            + '<section class="bf-card" style="padding-top:0;padding-bottom:4px">'
            + '<div class="bf-list__day">Hoje · 7 nov</div><ul class="bf-list">'
            + linha("despesa", "shopping-cart", "Mercado do bairro", "Mercado", "− R$ 32,90")
            + linha("despesa", "car", "Uber para o trabalho", "Transporte · pelo Atalho", "− R$ 18,40") + "</ul>"
            + '<div class="bf-list__day">Ontem · 6 nov</div><ul class="bf-list">'
            + linha("receita", "sparkles", "Freela site da padaria", "Renda extra", "+ R$ 850,00")
            + linha("despesa", "utensils", "Almoço", "Alimentação", "− R$ 41,00") + "</ul>"
            + '<div class="bf-list__day">5 nov</div><ul class="bf-list">'
            + linha("investimento", "piggy-bank", "Aporte mensal", "Tesouro Selic 2029", "R$ 1.500,00") + "</ul></section>", aba=1),
     """Lançamentos do mês, do mais novo ao mais antigo, agrupados por dia. O filtro troca na hora (sem ir ao servidor).
Lançamentos feitos pelo Atalho mostram "pelo Atalho" no metadado. Tocar numa linha abre a edição.""")

# 6 · Novo lançamento
tela("TelaNovoLancamento", "6 · Botão +: valor primeiro, categoria em um toque",
     iphone("", aba=None, sobre='<div class="bf-scrim"><div class="bf-sheet" style="display:grid;gap:16px">'
            '<div class="bf-sheet__grabber" style="margin-bottom:0"></div>'
            f'<div class="bf-sheet__head" style="margin:0"><h2 class="bf-sheet__title">Novo lançamento</h2><button class="bf-iconbtn" aria-label="Fechar">{i("x")}</button></div>'
            '<div class="bf-seg" role="radiogroup" aria-label="Tipo"><button class="bf-seg__opt" role="radio" aria-checked="true">Despesa</button><button class="bf-seg__opt" role="radio" aria-checked="false">Receita</button><button class="bf-seg__opt" role="radio" aria-checked="false">Investimento</button></div>'
            '<div class="bf-amount" style="padding:4px 0"><div class="bf-amount__value"><span class="bf-amount__currency">R$</span><span class="bf-amount__digits">32,90</span><span class="bf-amount__caret"></span></div></div>'
            f'<div class="bf-field"><span class="bf-field__label">Categoria</span>{chips(CATS, "Mercado")}</div>'
            '<label class="bf-field"><span class="bf-field__label">Com o quê (opcional)</span><input class="bf-input" placeholder="Ex.: Mercado do bairro"></label>'
            f'<button class="bf-btn bf-btn--primary bf-btn--block">{i("check")}Salvar gasto</button></div></div>'),
     """O sheet abre já com o teclado numérico no valor. A última categoria usada vem marcada; "Com o quê" é opcional
(vazio usa o nome da categoria). Salvar fecha na hora — o gasto aparece na lista sem esperar o servidor (tela 7).""")

# 7 · Gasto salvo
tela("TelaGastoSalvo", "7 · Depois de salvar: aparece na hora, com Desfazer",
     iphone(titulo("Lançamentos")
            + '<div class="bf-seg" role="radiogroup" aria-label="Filtro"><button class="bf-seg__opt" role="radio" aria-checked="true">Tudo</button><button class="bf-seg__opt" role="radio" aria-checked="false">Saiu</button><button class="bf-seg__opt" role="radio" aria-checked="false">Entrou</button><button class="bf-seg__opt" role="radio" aria-checked="false">Investiu</button></div>'
            + '<section class="bf-card" style="padding-top:0;padding-bottom:4px"><div class="bf-list__day">Hoje · 7 nov</div><ul class="bf-list">'
            + linha("despesa", "shopping-cart", "Mercado do bairro", "Mercado", "− R$ 32,90", " bf-row--pending")
            + linha("despesa", "car", "Uber para o trabalho", "Transporte", "− R$ 18,40") + "</ul></section>", aba=1,
            sobre=f'<div style="position:absolute;left:16px;right:16px;bottom:96px"><div class="bf-toast" role="status">{i("circle-check")}Gasto salvo · − R$ 32,90<button class="bf-toast__acao">Desfazer</button></div></div>'),
     """Interface otimista: a linha entra na lista no instante do toque (meio apagada, "salvando…") e fica normal quando o
servidor confirma. O aviso fica 5 s com Desfazer. Se falhar, a linha volta e o aviso diz "Não salvou. Tentar de novo".""")

# 8 · Editar
tela("TelaEditar", "8 · Editar e excluir (com confirmação)",
     iphone("", aba=None, sobre='<div class="bf-scrim"><div class="bf-sheet" style="display:grid;gap:16px">'
            '<div class="bf-sheet__grabber" style="margin-bottom:0"></div>'
            f'<div class="bf-sheet__head" style="margin:0"><h2 class="bf-sheet__title">Editar lançamento</h2><button class="bf-iconbtn" aria-label="Fechar">{i("x")}</button></div>'
            '<div class="bf-amount" style="padding:4px 0"><div class="bf-amount__value"><span class="bf-amount__currency">R$</span><span class="bf-amount__digits">32,90</span></div></div>'
            f'<div class="bf-field"><span class="bf-field__label">Categoria</span>{chips(CATS[:4], "Mercado")}</div>'
            '<label class="bf-field"><span class="bf-field__label">Com o quê</span><input class="bf-input" value="Mercado do bairro"></label>'
            f'<button class="bf-btn bf-btn--primary bf-btn--block">{i("check")}Salvar alterações</button>'
            '<div class="bf-card" style="background:var(--negative-soft);box-shadow:none;display:grid;gap:12px">'
            '<div class="body-strong is-negative">Excluir de vez? Isso não pode ser desfeito.</div>'
            '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px"><button class="bf-btn bf-btn--ghost">Cancelar</button><button class="bf-btn bf-btn--danger">Sim, excluir</button></div></div>'
            '</div></div>'),
     """Tocar numa linha abre este sheet. Agora também dá para trocar a categoria (útil quando o Atalho adivinhou errado).
"Excluir lançamento" vira a confirmação vermelha mostrada embaixo; aporte excluído devolve o valor ao investimento.""")

# 9 · Investimentos
grupo = lambda inst, total, nome, tipo, valor, ganho, desce=False, icone="landmark": (
    f'<section class="bf-card" style="padding-top:8px;padding-bottom:4px"><div class="bf-card__head" style="margin:0"><h3 class="bf-card__title">{inst}</h3><span class="caption num muted">{total}</span></div>'
    f'<ul class="bf-list"><li class="bf-row bf-inv"><span class="bf-cat bf-cat--invest">{i(icone)}</span><div class="bf-inv__main"><div class="bf-inv__name">{nome}</div><div class="bf-inv__where">{tipo}</div></div>'
    f'<div class="bf-inv__right"><div class="bf-inv__value">{valor}</div><div class="bf-inv__gain{" bf-inv__gain--down" if desce else ""}">{ganho}</div></div></li></ul></section>')
tela("TelaInvestimentos", "9 · Investimentos: patrimônio e posições por instituição",
     iphone(titulo("Investimentos")
            + '<section class="bf-card bf-balance"><div class="bf-balance__label">Patrimônio investido</div><div class="bf-balance__value">R$ 38.940,12</div>'
              '<div class="bf-balance__split" style="grid-template-columns:1fr 1fr"><div class="bf-stat"><div class="bf-stat__label">Aportado</div><div class="bf-stat__value">R$ 35.200</div></div>'
              '<div class="bf-stat"><div class="bf-stat__label">Rendeu</div><div class="bf-stat__value is-positive">+ R$ 3.740</div></div></div></section>'
            + f'<button class="bf-btn bf-btn--secondary bf-btn--block">{i("plus")}Adicionar investimento</button>'
            + grupo("XP", "R$ 21.304,55", "Tesouro Selic 2029", "Renda fixa", "R$ 21.304,55", "▲ 9,8% no ano")
            + grupo("Nubank", "R$ 11.515,57", "Caixinha reserva", "Renda fixa", "R$ 11.515,57", "▲ 10,4% no ano", icone="piggy-bank"), aba=3),
     """Patrimônio no topo, depois o botão de adicionar (fica sempre visível, não some atrás da barra de abas) e as
posições agrupadas por instituição. "Aportado" soma os aportes; "Rendeu" = valor atual − aportado.""")

# 10 · Novo investimento
tela("TelaNovoInvestimento", "10 · Novo investimento",
     iphone("", aba=None, sobre='<div class="bf-scrim"><div class="bf-sheet" style="display:grid;gap:16px">'
            '<div class="bf-sheet__grabber" style="margin-bottom:0"></div>'
            f'<div class="bf-sheet__head" style="margin:0"><h2 class="bf-sheet__title">Novo investimento</h2><button class="bf-iconbtn" aria-label="Fechar">{i("x")}</button></div>'
            '<label class="bf-field"><span class="bf-field__label">Nome</span><input class="bf-input" value="Tesouro Selic 2029"></label>'
            '<div class="bf-field"><span class="bf-field__label">Tipo</span><div class="bf-chips">'
            + "".join(f'<button class="bf-chip" aria-pressed="{"true" if t == "Renda fixa" else "false"}">{t}</button>' for t in ["Renda fixa", "Ações", "FII", "Cripto", "Outro"])
            + '</div></div>'
            '<label class="bf-field"><span class="bf-field__label">Onde está</span><input class="bf-input" value="XP"></label>'
            '<div class="bf-amount" style="padding:4px 0"><span class="bf-field__label">Valor atual</span><div class="bf-amount__value"><span class="bf-amount__currency">R$</span><span class="bf-amount__digits">21.304,55</span></div></div>'
            f'<button class="bf-btn bf-btn--primary bf-btn--block">{i("check")}Salvar investimento</button></div></div>'),
     """Cadastro de investimento: nome, tipo, onde está e quanto vale hoje. Instituições já usadas aparecem como sugestão
ao digitar "Onde está". Aportes depois são feitos pelo + (tipo Investimento).""")

# 11 · Ajustes
tela("TelaAjustes", "11 · Ajustes: Atalho no Botão de Ação, token e sair",
     iphone(titulo("Ajustes")
            + '<section class="bf-card" style="display:grid;gap:14px"><h3 class="bf-card__title">Lançar sem abrir o app</h3>'
              '<ol class="bf-steps"><li>Instale o Atalho "Gasto rápido" (botão abaixo).</li>'
              '<li>Ajustes do iPhone › Botão de Ação › Atalho › Gasto rápido.</li>'
              '<li>Aperte o botão, escolha a categoria, digite o valor e (se quiser) com o quê.</li></ol>'
              f'<button class="bf-btn bf-btn--primary bf-btn--block">{i("download")}Instalar o Atalho</button></section>'
            + '<section class="bf-card" style="display:grid;gap:10px"><h3 class="bf-card__title">Token do Atalho</h3>'
              '<div class="caption">Criado em 07/11/2026 · usado hoje às 17:20</div>'
              f'<button class="bf-btn bf-btn--ghost" style="justify-self:start;padding:0">{i("key-round")}Gerar token novo</button>'
              '<div class="caption muted">Gerar um novo desliga o anterior. Use se perder o iPhone.</div></section>'
            + '<section class="bf-card" style="display:grid;gap:4px"><div class="caption muted">Conta</div><div class="body-strong">voce@email.com</div>'
              '<button class="bf-btn bf-btn--ghost" style="justify-self:start;padding:0;color:var(--negative)">Sair</button></section>', aba=4),
     """Ajustes ensina o caminho mais confiável (Botão de Ação, que funciona com capinha) e mostra o estado do token.
"Instalar o Atalho" abre um link do iCloud com o Atalho pronto; o token é colocado sozinho na instalação.""")

# 12 · Fluxo do Atalho (2 passos)
painel = lambda titulo_, conteudo, legenda: (f'<figure style="margin:0;display:grid;gap:10px;align-content:start"><span class="label muted">{titulo_}</span>{conteudo}'
                                              f'<figcaption class="caption muted">{legenda}</figcaption></figure>')
CHECK_BRANCO = i("check", ' style="color:#fff"')
LISTA = "".join(
    f'<div style="display:flex;align-items:center;gap:10px;padding:10px 4px;border-top:1px solid var(--line)">{i(ic)}<span class="body">{nome}</span></div>'
    for ic, nome in CATS)
TECLADO = ('<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-top:4px">'
           + "".join(f'<span style="text-align:center;padding:8px 0;border-radius:8px;background:var(--surface-sunken);font:600 17px/22px var(--font-sans)">{k}</span>' for k in "123456789,0⌫")
           + "</div>")
cabeca = lambda sub: (f'<div class="bf-ios-prompt__titulo"><span class="bf-ios-notif__icone" style="width:22px;height:22px;border-radius:6px"></span>Gasto rápido{sub}</div>')
FORMAS_ATALHO = "".join(
    f'<div style="display:flex;align-items:center;gap:10px;padding:10px 4px;border-top:1px solid var(--line)">{i(ic)}<span class="body">{nome}</span>{dica}</div>'
    for ic, nome, dica in [("credit-card", "Crédito · Nubank", '<span class="caption muted" style="margin-left:auto">último usado</span>'),
                           ("wallet", "Débito", ""), ("zap", "Pix", ""), ("credit-card", "Crédito · Itaú", "")])
tela("FluxoAtalho", "12 · Atalho: categoria → quanto → com o quê → como pagou → (no crédito) em quantas vezes → pronto",
     '<div style="display:grid;grid-template-columns:repeat(6,1fr);gap:16px;padding:16px">'
     + painel("1 · Aperta o Botão de Ação e escolhe",
              f'<div class="bf-ios-prompt" style="gap:4px">{cabeca("")}'
              f'<div class="bf-ios-prompt__pergunta" style="margin:4px 0 6px">Categoria</div>{LISTA}</div>',
              "A lista vem do app (~0,35 s): categoria nova ou renomeada aparece sozinha.")
     + painel("2 · Quanto?",
              f'<div class="bf-ios-prompt">{cabeca(" · Lazer")}'
              '<div class="bf-ios-prompt__pergunta">Quanto?</div><div class="bf-ios-prompt__campo">1.200</div>'
              f'{TECLADO}</div>',
              "Teclado numérico; o valor total da compra. O app converte para centavos.")
     + painel("3 · Com o quê? (opcional)",
              f'<div class="bf-ios-prompt">{cabeca(" · Lazer · R$ 1.200,00")}'
              '<div class="bf-ios-prompt__pergunta">Com o quê?</div><div class="bf-ios-prompt__campo">Fone de ouvido</div>'
              '<div class="bf-ios-prompt__acoes"><span>Cancelar</span><span>OK</span></div></div>',
              "Pode dar OK vazio: a descrição vira o nome da categoria.")
     + painel("4 · Como pagou?",
              f'<div class="bf-ios-prompt" style="gap:4px">{cabeca(" · Fone de ouvido")}'
              f'<div class="bf-ios-prompt__pergunta" style="margin:4px 0 6px">Como pagou?</div>{FORMAS_ATALHO}</div>',
              "Abre com o que você usou da última vez nessa categoria.")
     + painel("5 · Em quantas vezes? (só no crédito)",
              f'<div class="bf-ios-prompt">{cabeca(" · Nubank")}'
              '<div class="bf-ios-prompt__pergunta">Em quantas vezes?</div><div class="bf-ios-prompt__campo">3</div>'
              f'{TECLADO}</div>',
              "Só aparece se você escolher um cartão. 1 (ou vazio) é à vista; vai até 24.")
     + painel("6 · Notificação de volta",
              f'<div class="bf-ios-notif"><span class="bf-ios-notif__icone">{CHECK_BRANCO}</span>'
              '<div style="flex:1"><div class="body-strong">BlueFinance</div><div class="caption">Gasto salvo: Lazer · − R$ 1.200,00 em 3x no crédito (Nubank, 1ª na fatura de dezembro)</div></div><span class="caption muted">agora</span></div>',
              "No crédito, diz em quantas vezes e em qual fatura cai a 1ª parcela. À vista: \"no crédito (Nubank, fatura de dezembro)\".")
     + "</div>",
     """Atalho no Botão de Ação: categoria, valor (teclado numérico), com o quê (opcional) e como pagou. Se escolher um
cartão, pergunta em quantas vezes (teclado numérico; 1 é à vista). Débito e Pix não têm esse passo. Uma chamada salva, no fim.""",
     altura=560, largura=1560)

# 13 · Novo lançamento no crédito
FORMAS = ('<div class="bf-seg" role="radiogroup" aria-label="Como pagou"><button class="bf-seg__opt" role="radio" aria-checked="false">Débito</button>'
          '<button class="bf-seg__opt" role="radio" aria-checked="false">Pix</button><button class="bf-seg__opt" role="radio" aria-checked="true">Crédito</button></div>')
tela("TelaCredito", "13 · Botão + no crédito: cartão, parcelas e em qual fatura cai",
     iphone("", aba=None, sobre='<div class="bf-scrim"><div class="bf-sheet" style="display:grid;gap:14px">'
            '<div class="bf-sheet__grabber" style="margin-bottom:0"></div>'
            f'<div class="bf-sheet__head" style="margin:0"><h2 class="bf-sheet__title">Novo lançamento</h2><button class="bf-iconbtn" aria-label="Fechar">{i("x")}</button></div>'
            '<div class="bf-amount" style="padding:0"><div class="bf-amount__value"><span class="bf-amount__currency">R$</span><span class="bf-amount__digits">1.200,00</span></div></div>'
            f'<div class="bf-field"><span class="bf-field__label">Categoria</span>{chips(CATS[:4], "Lazer")}</div>'
            f'<div class="bf-field"><span class="bf-field__label">Como pagou</span>{FORMAS}</div>'
            '<div class="bf-field"><span class="bf-field__label">Cartão</span><div class="bf-chips">'
            f'<button class="bf-chip" aria-pressed="true">{i("credit-card")}Nubank</button><button class="bf-chip" aria-pressed="false">{i("credit-card")}Itaú</button></div></div>'
            '<div class="bf-field"><span class="bf-field__label">Parcelas</span><div class="bf-stepper"><button aria-label="Menos">−</button><span class="bf-stepper__valor">3x de R$ 400,00</span><button aria-label="Mais">+</button></div></div>'
            f'<div class="bf-nota">{i("calendar")}<span>1ª parcela na fatura de <b>dezembro</b> (o Nubank fecha dia 3; hoje é 7). Última em fevereiro.</span></div>'
            f'<button class="bf-btn bf-btn--primary bf-btn--block">{i("check")}Salvar gasto</button></div></div>'),
     """Como pagou: Débito, Pix (os dois saem na hora, no mês da compra) ou Crédito. No crédito aparecem o cartão
(último usado já marcado) e as parcelas (1x a 24x). A nota diz em qual fatura cai a 1ª parcela pelo dia de fechamento
do cartão: compra a partir do dia do fechamento vai para a fatura seguinte. Centavos que sobram ficam na 1ª parcela.""")

# 14 · Lançamentos com fatura
tela("TelaFatura", "14 · Lançamentos: parcelas aparecem na fatura do mês",
     iphone(titulo("Lançamentos · Dezembro", f'<button class="bf-iconbtn" aria-label="Trocar mês">{i("calendar")}</button>')
            + '<section class="bf-card" style="padding-top:8px;padding-bottom:4px">'
              f'<div class="bf-card__head" style="margin:0"><h3 class="bf-card__title" style="display:flex;gap:8px;align-items:center">{i("credit-card")}Fatura Nubank</h3><span class="caption num muted">R$ 548,30</span></div>'
              '<div class="caption muted">Fecha dia 3 de dezembro</div><ul class="bf-list">'
            + linha("despesa", "ticket", "Fone de ouvido", "Lazer · 1/3 · comprado em 7 nov", "− R$ 400,00")
            + linha("despesa", "shopping-cart", "Mercado do mês", "Mercado · à vista · 20 nov", "− R$ 148,30")
            + '</ul></section>'
            + '<section class="bf-card" style="padding-top:0;padding-bottom:4px"><div class="bf-list__day">5 dez</div><ul class="bf-list">'
            + linha("despesa", "house", "Aluguel", "Moradia · Pix", "− R$ 1.600,00")
            + linha("receita", "briefcase", "Salário", "Salário", "+ R$ 8.500,00") + "</ul>"
            + '<div class="bf-list__day">2 dez</div><ul class="bf-list">'
            + linha("despesa", "car", "Uber", "Transporte · Débito · pelo Atalho", "− R$ 18,40") + "</ul></section>", aba=1),
     """No mês, as compras no crédito ficam juntas no card da fatura do cartão (total da fatura no topo); débito e Pix
seguem por dia. Cada parcela mostra "1/3" e quando foi comprada. Tocar numa parcela abre a compra inteira (tela 17).""")

# 15 · Início com cartão
credito = ('<section class="bf-card" aria-label="Cartão de crédito" style="display:grid;gap:10px">'
           f'<div class="bf-card__head" style="margin:0"><h3 class="bf-card__title" style="display:flex;gap:8px;align-items:center">{i("credit-card")}Cartão de crédito</h3><a class="bf-link" href="#">Ver fatura</a></div>'
           '<div class="bf-balance__split" style="grid-template-columns:1fr 1fr">'
           '<div class="bf-stat"><div class="bf-stat__label">Fatura de novembro</div><div class="bf-stat__value">R$ 1.240</div></div>'
           '<div class="bf-stat"><div class="bf-stat__label">Parcelas a vir</div><div class="bf-stat__value">R$ 2.400</div></div></div>'
           '<div class="caption muted">Nubank fecha dia 3 · 4 compras parceladas até março</div></section>')
tela("TelaInicioCredito", "15 · Início: quanto do mês é cartão e quanto já está comprometido",
     iphone(topo_inicio("R$ 4.218,35", "R$ 9.350", "R$ 3.632", "R$ 1.500") + credito + ultimos, aba=0),
     """O "Saiu" do mês já inclui as parcelas que caem nele. O card do cartão mostra a fatura do mês (soma do crédito
que cai neste mês) e "Parcelas a vir": o que já está comprometido nos meses seguintes. Só aparece se houver cartão.""")

# 16 · Cartões em Ajustes
tela("TelaCartoes", "16 · Ajustes › Cartões: nome e dia de fechamento",
     iphone(titulo("Ajustes")
            + '<section class="bf-card" style="padding-top:8px;padding-bottom:4px"><div class="bf-card__head" style="margin:0"><h3 class="bf-card__title">Cartões de crédito</h3></div><ul class="bf-list">'
            + f'<li class="bf-row"><span class="bf-cat bf-cat--neutral">{i("credit-card")}</span><div class="bf-row__main"><div class="bf-row__title">Nubank</div><div class="bf-row__meta">Fecha dia 3</div></div>{i("chevron-right", cls="muted")}</li>'
            + f'<li class="bf-row"><span class="bf-cat bf-cat--neutral">{i("credit-card")}</span><div class="bf-row__main"><div class="bf-row__title">Itaú</div><div class="bf-row__meta">Fecha dia 25</div></div>{i("chevron-right", cls="muted")}</li></ul>'
            + f'<button class="bf-btn bf-btn--ghost" style="padding:0">{i("plus")}Adicionar cartão</button></section>', aba=4,
            sobre='<div class="bf-scrim"><div class="bf-sheet" style="display:grid;gap:16px">'
            '<div class="bf-sheet__grabber" style="margin-bottom:0"></div>'
            f'<div class="bf-sheet__head" style="margin:0"><h2 class="bf-sheet__title">Novo cartão</h2><button class="bf-iconbtn" aria-label="Fechar">{i("x")}</button></div>'
            '<label class="bf-field"><span class="bf-field__label">Nome</span><input class="bf-input" value="Nubank"></label>'
            '<div class="bf-field"><span class="bf-field__label">Dia que a fatura fecha</span><div class="bf-stepper"><button aria-label="Menos">−</button><span class="bf-stepper__valor">dia 3</span><button aria-label="Mais">+</button></div>'
            '<span class="bf-field__hint">Está no app do banco, perto da data de vencimento. Compras a partir desse dia vão para a fatura seguinte.</span></div>'
            f'<button class="bf-btn bf-btn--primary bf-btn--block">{i("check")}Salvar cartão</button></div></div>'),
     """Cartões ficam em Ajustes: nome e dia em que a fatura fecha (1 a 31; em meses mais curtos vale o último dia).
É o único dado necessário para saber em qual mês cada parcela cai. Tocar num cartão edita ou exclui.""")

# 17 · Editar compra parcelada
QUANDO = lambda texto: (f'<div class="bf-field"><span class="bf-field__label">Quando</span><div class="bf-input" style="display:flex;justify-content:space-between;align-items:center">'
                        f'<span>{texto}</span>{i("calendar", cls="muted")}</div></div>')
CARTOES = ('<div class="bf-chips">'
           f'<button class="bf-chip" aria-pressed="true">{i("credit-card")}Nubank</button><button class="bf-chip" aria-pressed="false">{i("credit-card")}Itaú</button></div>')
cabeca_sheet = lambda t: (f'<div class="bf-sheet__grabber" style="margin-bottom:0"></div>'
                          f'<div class="bf-sheet__head" style="margin:0"><h2 class="bf-sheet__title">{t}</h2><button class="bf-iconbtn" aria-label="Fechar">{i("x")}</button></div>')
tela("TelaEditarParcelada", "17 · Tocar numa parcela abre a compra inteira: total, data, cartão e parcelas",
     iphone("", aba=None, sobre='<div class="bf-scrim"><div class="bf-sheet" style="display:grid;gap:12px">'
            + cabeca_sheet("Compra parcelada")
            + '<div class="bf-amount" style="padding:0"><span class="bf-field__label">Valor total</span><div class="bf-amount__value"><span class="bf-amount__currency">R$</span><span class="bf-amount__digits">1.200,00</span></div></div>'
            + QUANDO("7 nov 2026")
            + f'<div class="bf-field"><span class="bf-field__label">Como pagou</span>{FORMAS}{CARTOES}</div>'
            '<div class="bf-field"><span class="bf-field__label">Parcelas</span><div class="bf-stepper"><button aria-label="Menos">−</button><span class="bf-stepper__valor">3x de R$ 400,00</span><button aria-label="Mais">+</button></div></div>'
            '<ul class="bf-list" style="padding:0 4px">'
            '<li class="bf-row" style="min-height:34px;padding:6px 0"><div class="bf-row__main body">1/3 · fatura de dezembro</div><span class="bf-row__amount">R$ 400,00</span></li>'
            '<li class="bf-row" style="min-height:34px;padding:6px 0"><div class="bf-row__main body">2/3 · fatura de janeiro</div><span class="bf-row__amount">R$ 400,00</span></li>'
            '<li class="bf-row" style="min-height:34px;padding:6px 0"><div class="bf-row__main body">3/3 · fatura de fevereiro</div><span class="bf-row__amount">R$ 400,00</span></li></ul>'
            f'<button class="bf-btn bf-btn--primary bf-btn--block">{i("check")}Salvar alterações</button></div></div>'),
     """Uma parcela nunca é editada sozinha: o sheet mostra a compra inteira. Dá para mudar o total, a data da compra,
o cartão e o número de parcelas: a divisão e os meses são refeitos (data ou cartão novos recalculam em qual fatura cai a 1ª).
Trocar para Débito ou Pix desfaz o parcelamento: vira um gasto só, com o total, no mês da data. Abaixo seguem
categoria, "Com o quê" e "Excluir as 3 parcelas" (com confirmação).""")

# 18 · Editar gasto: data e forma de pagamento
tela("TelaEditarGasto", "18 · Editar gasto: data e como pagou (Débito → Crédito leva para a fatura)",
     iphone("", aba=None, sobre='<div class="bf-scrim"><div class="bf-sheet" style="display:grid;gap:12px">'
            + cabeca_sheet("Editar lançamento")
            + '<div class="bf-amount" style="padding:0"><div class="bf-amount__value"><span class="bf-amount__currency">R$</span><span class="bf-amount__digits">18,40</span></div></div>'
            + QUANDO("Ontem · 6 nov")
            + f'<div class="bf-field"><span class="bf-field__label">Categoria</span>{chips(CATS[1:4], "Transporte")}</div>'
            + f'<div class="bf-field"><span class="bf-field__label">Como pagou</span>{FORMAS}{CARTOES}</div>'
            '<div class="bf-field"><span class="bf-field__label">Parcelas</span><div class="bf-stepper"><button aria-label="Menos">−</button><span class="bf-stepper__valor">1x de R$ 18,40</span><button aria-label="Mais">+</button></div></div>'
            f'<div class="bf-nota">{i("calendar")}<span>Vai para a fatura de <b>dezembro</b> (o Nubank fecha dia 3; comprado dia 6).</span></div>'
            f'<button class="bf-btn bf-btn--primary bf-btn--block">{i("check")}Salvar alterações</button></div></div>'),
     """Editar um gasto agora inclui "Quando" (o calendário do iPhone; até hoje) e "Como pagou". Mudar a data leva o
lançamento para o mês certo. Trocar de Débito/Pix para Crédito mostra cartão e parcelas, igual ao botão +: ao salvar, o
gasto vira uma compra no cartão e cai na fatura pela data e pelo fechamento. Receitas e aportes também ganham "Quando".
Abaixo seguem "Com o quê" e "Excluir lançamento".""")

print("telas geradas em", RAIZ)
