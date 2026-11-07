BlueFinance é um app pessoal de finanças para iPhone: lançar um gasto em segundos, ver para onde o dinheiro foi e acompanhar onde ele está investido. A interface é calma, direta e numérica — o número é o herói, a cor só confirma o que o sinal e o texto já dizem.

## Princípios

1. **Lançar é mais importante que analisar.** Qualquer caminho até "Salvar gasto" tem no máximo 3 passos (categoria, o quê, quanto).
2. **O número manda.** Valores são o maior elemento de cada card, em `amount-hero` / `amount-lg` / `amount`, sempre com números tabulares (`.num`).
3. **Cor nunca sozinha.** Despesa leva `−`, receita leva `+`, rendimento leva ▲/▼ e texto. A cor (`negative`, `positive`, `invest`) só reforça.
4. **Um toque, um alvo.** Todo alvo de toque tem pelo menos `tap-min` (44px).

## Conteúdo e voz

- Português do Brasil, falando com **você**, frases curtas, sem jargão de banco. "Sobrou em novembro", não "Saldo líquido do período".
- Caixa de frase em tudo: títulos, botões, abas ("Novo lançamento", "Salvar gasto"). Nunca CAIXA ALTA.
- Botões são verbo + objeto: "Salvar gasto", "Adicionar conta", "Excluir lançamento".
- Sem emoji na interface. Ícones vêm do Lucide.
- Dinheiro: `R$ 1.234,56` (ponto no milhar, vírgula nos centavos, espaço depois de `R$`). Despesa `− R$ 32,90` com o sinal de menos tipográfico (U+2212); receita `+ R$ 850,00`; aporte sem sinal.
- Totais em cards pequenos podem cortar centavos: `R$ 9.350`.
- Datas curtas e relativas: "Hoje", "Ontem", "5 nov", "Novembro". Ano só quando não é o atual.
- Porcentagens com vírgula: "9,8% no ano".
- Vazio fala o próximo passo: "Nenhum lançamento ainda. Toque em + ou aperte o Botão de Ação do iPhone."

## Cor

- Tela em `bg`; cards em `surface`; sheets em `surface-raised`; campos e segmented em `surface-sunken`.
- Texto principal `ink`, secundário `ink-muted` — os dois passam 4.5:1 em todas as superfícies nos dois temas.
- `brand` é para **uma** ação principal por tela, a aba ativa e links. Texto sobre ela é `on-brand`.
- Semântica fixa por tipo de lançamento: despesa `negative` / `negative-soft`, receita `positive` / `positive-soft`, investimento `invest` / `invest-soft`. Não use essas cores para mais nada.
- `negative` é laranja-queimado, não vermelho, e `positive` é verde-escuro: diferem em matiz **e** contam com o sinal, por isso funcionam para daltonismo.
- Gráficos usam `chart-1` … `chart-6` em ordem fixa por categoria (Moradia, Mercado, Transporte, Alimentação, Lazer, Saúde); a categoria "Outros" e qualquer uma além da 6ª usam `chart-other`. A cor segue a categoria, nunca o ranking. Paleta validada para daltonismo (ΔE ≥ 8 entre vizinhas); `chart-3`, `chart-4`, `chart-5` ficam abaixo de 3:1 no tema claro, então gráfico sempre tem legenda com valores.
- Tema escuro é escolhido, não invertido: segue o ajuste do iPhone.

## Tipografia

- Uma família: **Manrope** (Google Fonts), com fallback para a fonte do sistema.
- Títulos de tela em `title`, um por tela. Títulos de card em `headline`. Texto em `body`; metadados em `caption`; rótulos de campo e abas em `label`.
- Valores: `amount-hero` (saldo, valor digitado), `amount-lg` (totais), `amount` (linhas). Sempre `font-variant-numeric: tabular-nums`.

## Espaço, forma e profundidade

- Margem lateral da tela e padding de card: `space-4`. Entre cards: `space-3`. Entre seções: `space-6`.
- Raios: cards `radius-lg`, controles `radius-md`, sheets `radius-xl`, chips e botão + `radius-pill`.
- Sombra só em dois lugares: `shadow-card` (cards no tema claro) e `shadow-sheet` (sheets e botão +). No escuro, superfícies se separam pelo tom.
- Divisórias `line` são decorativas; bordas de controle usam `line-strong` (3:1).
- Foco: anel sólido de 2px em `focus`, afastado 2px, em todo controle.
- Movimento: curto e funcional — botão encolhe a 98% ao pressionar, sheet sobe em ~250ms. Nada pisca exceto o cursor do valor.

## Fluidez

- **Nada espera o servidor para responder ao toque.** Salvar fecha o sheet na hora e a linha entra na lista com `bf-row--pending` ("salvando…"); quando o servidor confirma, ela fica normal. Se falhar, a linha sai e o aviso diz "Não salvou. Tentar de novo".
- **Aviso com Desfazer** (`bf-toast`, 5 s, acima da barra de abas) depois de salvar, editar ou excluir.
- **Esqueleto, nunca "Carregando…".** `bf-skel` tem o formato do conteúdo final, para nada pular quando os dados chegam. Sem brilho com "Reduzir movimento".
- A barra de abas e o botão + nunca esperam dados; cada aba mostra o esqueleto dela.
- O filtro de Lançamentos troca no aparelho, sem ir ao servidor.

## Iconografia

- **Lucide** (traço 2px, cantos arredondados), 20px em linhas e botões, 24px nas abas, 16px em chips.
- No app: `lucide-react`. Ícones de categoria: Moradia `house`, Mercado `shopping-cart`, Transporte `car`, Alimentação `utensils`, Lazer `ticket`, Saúde `heart-pulse`, Outros `circle-ellipsis`, Salário `briefcase`, Renda extra `sparkles`, Investimento `piggy-bank`, Renda fixa `landmark`, FII `building-2`, Transferência `arrow-left-right`.
- Direção: entrou `arrow-down-left`, saiu `arrow-up-right`.
- Ícone sempre ao lado de texto, exceto botões só-ícone, que levam `aria-label`.

## Logo

Ainda não há logo. Escreva o nome "BlueFinance" em Manrope 800, `ink`.

## Telas e navegação

- Abas: Início, Lançamentos, (+), Investir, Ajustes. O + central abre o sheet de novo lançamento.
- Fora do app, o lançamento rápido é o Atalho do iOS no **Botão de Ação** (o Toque Traseiro falha com capinha): escolher a categoria e digitar "32,90 mercado do bairro"; uma notificação de volta (card FluxoAtalho).
- Layout pensado para iPhone 16 (393 × 852 pt). No computador, a mesma coluna centralizada com largura máxima de 480px.
