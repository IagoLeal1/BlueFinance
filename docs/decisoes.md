# BlueFin — tudo o que foi decidido

Registro das decisões do projeto (07 a 12/11/2026), com o porquê de cada uma. Serve para quem continuar o
trabalho, pessoa ou Claude, não refazer uma discussão que já foi resolvida. Quando uma decisão mudar,
atualize aqui.

## Onde está cada coisa

| O quê | Onde |
|---|---|
| App em produção | https://bluefinance-chi.vercel.app (instalado no iPhone como "BlueFin") |
| Código | https://github.com/IagoLeal1/BlueFinance (repositório público, branch `main`) |
| Design kit (fonte) | `design/project/` — tokens em `tokens.json`, telas em `components/Tela*/` (geradas por `design/scripts/gerar-telas.py`) |
| Design System publicado | https://claude.ai/artifact/H45MoajMVUH6by18cdb4Dc |
| Arquitetura | `docs/arquitetura.html`, publicada em https://claude.ai/artifact/APQibxK778Eo6kid9Jht6A |
| Análise e stack (fase 1) | `docs/01-analise-e-stack.md` |
| Plano de testes | `docs/03-plano-de-testes.md` |
| Atalho do iPhone | `docs/04-atalho-ios.md` |
| Publicação (Supabase + Vercel) | `docs/05-publicacao.md` |

## Como o trabalho é feito

- **Em português (pt-BR)**, no app e nas conversas.
- **Design primeiro, depois aprovação, depois código.** Toda mudança visível ganha uma tela no design kit
  (publicada no Design System) e só é implementada depois de "Aprovado, implementar".
- **TDD com Playwright, em fatias verticais:** um teste que falha (vermelho), o mínimo de código para passar
  (verde), e assim por diante. Três frentes: `unit` (regras de `src/domain`), `api` (Atalho, tokens,
  avisos, isolamento entre pessoas) e `e2e-iphone` (WebKit no tamanho do iPhone 16).
- **Commit e push no `main` ao fim de cada entrega**; o push publica na Vercel.
- **O dono confirma antes** de migração no banco de produção e de qualquer publicação externa.
- **Segredos só passam pelas mãos do dono:** chave secreta do Supabase, chave privada VAPID, `CRON_SECRET`
  e o token do Atalho nunca são digitados nem repetidos por quem ajuda.

## Plataforma

- **App web instalado (PWA) + Supabase + Atalho do iOS, sem app nativo.** Um app nativo pediria a conta de
  desenvolvedor da Apple (US$ 99 por ano); o dono recusou. Sem Xcode, sem App Store. Empacotar com
  Capacitor fica como caminho aberto para o futuro.
- **Stack:** Next.js 16 (App Router, Server Actions, `proxy.ts`), TypeScript, Tailwind v4 + shadcn/ui (Base
  UI), Supabase (Postgres 17, login, RLS) em São Paulo, Vercel na região `gru1`.
- **Lançamento rápido pelo Botão de Ação**, com um Atalho do iOS. A Dynamic Island não aceita digitação, e
  app web não aparece no Botão de Ação: o Atalho faz a ponte chamando a API.
- **Login por e-mail e senha, sem tela de criar conta.** É um app de uma pessoa; o cadastro está fechado no
  Supabase. Criar conta para outra pessoa foi proposto e recusado por enquanto.

## Identidade visual

- **Direção A, "BlueFin"** (entre três propostas: BlueFin, Caderneta e Cobalto): a barbatana do atum-azul
  cortando a linha d'água. Ícone com degradê **Abismo → Atum** (`#0b1f4d` → `#1846c8`), barbatana branca e
  linha d'água em **Água** (`#3ccfc6`). Nome curto "BlueFin", logotipo "bluefin" com "fin" na cor da marca.
- **Fonte Manrope.** O dono usa o **tema escuro**; os dois temas existem e são validados.
- **O topo do Início** é o degradê da marca com a onda da linha d'água recortando o fundo.

## Cores das categorias

- **Cada categoria de gasto tem a sua cor**, a mesma nas linhas e na barra "Gastos por categoria": Moradia
  azul, Mercado laranja, Transporte verde-água, Alimentação âmbar, Lazer rosa, Saúde verde. Outros é cinza.
  Receita continua verde e aporte, âmbar.
- **A cor nunca é o único sinal:** toda linha tem ícone e nome. O valor continua vermelho (saiu) ou verde
  (entrou); a cor da categoria diz "o quê".
- **Fatura é uma categoria própria, na cor Céu:** azul-céu pastel no escuro (`#8fd3ff`, fundo do ícone
  `#2e4660`) e azul-oceano no claro (`#025884`, fundo `#d1e1e9`). Antes foram recusadas as listras azul e
  água ("nada a ver com o app") e o lilás ("não orna com o tema"). O dono quer cor lisa, que combine com o
  azul do app; Céu foi a mais distinta das outras categorias pelo validador de cores nos dois temas.
- **Cores são conferidas por script, não no olho:** separação entre categorias (ΔE) para visão normal e
  daltonismo, e contraste do ícone de pelo menos 3:1 sobre o fundo dele.

## Dinheiro e datas

- **Valores em centavos inteiros** (R$ 32,90 = 3290). Nunca número com vírgula.
- **Fuso de Brasília** (`America/Sao_Paulo`) para dia e mês.
- **Mês da fatura:** compra a partir do dia do fechamento vai para a fatura seguinte.
- **Vencimento:** se o dia de vencer é depois do de fechar, vence no mesmo mês; senão, no seguinte. Dia 31
  vira o último dia do mês. Cada cartão tem dia de fechar e de vencer (o do dono: C6bank, fecha 4, vence 11).
- **O dinheiro do crédito sai no vencimento (regime de caixa).** Compra no crédito só entra em "Saiu" no dia
  em que a fatura vence; até lá aparece em "A pagar", e o Início mostra "Depois da fatura do C6bank
  (dia 11): R$ …". Pedido do dono: a fatura de novembro só desconta no dia de pagar.
- **Parcelas de 1 a 24**, uma linha por parcela, cada uma já no mês da sua fatura. Os centavos que sobram
  vão na primeira (R$ 100 em 3x = 33,34 + 33,33 + 33,33).
- **"Todo mês" (assinatura) no crédito:** o mesmo valor em toda fatura, lançado 24 meses à frente e
  completado sozinho. Mudar o valor vale da fatura aberta em diante; parar apaga as faturas depois da
  aberta.

## Cartão e fatura

- **No Início, cada cartão mostra a fatura fechada (a pagar, com o vencimento) e a aberta.**
- **"Lançar o total da fatura":** quando uma fatura fechou sem compras lançadas (de antes de usar o app),
  dá para lançar o total de uma vez, na categoria Fatura.
- **Lançamentos tem dois extratos:** Débito é a conta (receitas, débito, Pix, aportes e cada fatura numa
  linha só, no dia do vencimento); Crédito são as compras no cartão, juntas por fatura. Quem usa VR ganha um
  terceiro, VR (ver abaixo).
- **Filtro por categoria em Lançamentos** (tela 28): uma fileira de categorias em cima do extrato. Tocar numa
  mostra o total dela no mês, somando Débito, Pix, Crédito e VR, separado por forma, e só os gastos dela; as
  abas de extrato saem enquanto uma categoria está marcada. O total é o mesmo número de "Gastos por categoria"
  do Início (crédito no mês da fatura). Só aparecem categorias com gasto no mês, na ordem do app; a troca é no
  aparelho. No Início, tocar numa categoria de "Gastos por categoria" abre Lançamentos já filtrado.

## Lançar e editar

- **Botão +:** valor primeiro, categoria em um toque, "Como pagou" (Débito, Pix ou Crédito, com cartão e
  parcelas). O lançamento aparece na hora, antes da resposta do servidor.
- **Editar:** valor, categoria, descrição, data ("Quando", até hoje) e como pagou. Débito → Crédito leva o
  gasto para a fatura certa. Tocar numa parcela abre a compra inteira (total, data, cartão, parcelas); trocar
  para Débito ou Pix volta a ser à vista.

## Atalho do iPhone ("Gasto rápido")

- **Ordem das perguntas:** Categoria → quanto e com o quê ("32,90 mercado do bairro") → Como pagou? (o
  último usado naquela categoria vem primeiro) → Em quantas vezes? (só no crédito). A Fatura não aparece na
  lista de categorias.
- **VR em "Como pagou?"**, depois do Pix, para quem configurou o VR. A lista vem da API, então o Atalho não
  precisa ser editado. No VR não pergunta em quantas vezes; a notificação diz quanto sobra no VR.
- **Visual no iPhone:** a pergunta se chama "Categoria"; o Atalho é azul-escuro com o ícone de peixe.
- **Token pessoal:** gerado em Ajustes › Atalho do iPhone, aparece uma vez; o banco guarda só o hash; gerar
  outro desliga o anterior. Fica no primeiro passo do Atalho, então **não compartilhe o Atalho como está**:
  duplique, apague o token da cópia e compartilhe a cópia.

## Aviso da fatura e uso sem internet

- **Aviso por Web Push** no dia anterior e no dia do vencimento, às 9h (agendamento da Vercel). Só funciona
  com o app aberto pela Tela de Início; liga em Ajustes.
- **Sem internet:** as telas abrem pela última versão guardada (service worker, só em produção) e os
  lançamentos esperam numa fila no aparelho; reenviar não duplica.

## Investimentos

- **Rendimento automático por % do CDI** (CDB, LCI, LCA): o CDI diário vem do Banco Central (série SGS 12).
  Cada aporte rende desde a própria data, só em dias úteis; o app pode ficar 1 dia útil atrás do app do
  banco.
- **Aporte novo entra no mesmo investimento** e soma no mesmo acúmulo.
- **Bruto e líquido:** o valor principal é o bruto (como o banco mostra); o detalhe mostra o líquido se
  resgatar hoje (IOF nos 30 primeiros dias, IR regressivo de 22,5% a 15% por aporte; LCI e LCA isentas).
- **"Ajustar valor":** a diferença para o valor do banco vira rendimento, e o cálculo segue dali.
- **Rendimento não entra em Sobrou nem em Investiu** (Investiu são os aportes, dinheiro que saiu da conta).
- Prefixado e IPCA+ ficam para depois.

## VR (vale-refeição)

Pedido do dono em 12/11/2026 (tela 27).

- **Um segundo saldo, separado da conta.** O depósito do VR não entra em "Entrou" e o gasto pago com VR não
  entra em "Saiu" nem em "Sobrou". O gasto no VR **conta em "Gastos por categoria"**: continua sendo dinheiro
  gasto em Mercado ou Alimentação.
- **O que sobra acumula** para o mês seguinte, como nos cartões de VR em geral.
- **Ajustes › Vale-refeição:** quanto cai por mês, o dia que cai (31 em mês curto cai no último dia) e o saldo
  de hoje. O depósito de cada mês entra sozinho, como um lançamento "Depósito do VR" no dia dele, a partir do
  dia seguinte ao da configuração (o saldo informado já inclui os anteriores). Um depósito por mês, garantido
  por índice único no banco.
- **Saldo de hoje:** na primeira vez entra como "Saldo inicial do VR"; depois, a diferença para o saldo que o
  app calculou vira um "Acerto do saldo do VR". Depósito e acerto não se editam na lista; o saldo se corrige em
  Ajustes. Acerto não é gasto de categoria nenhuma.
- **Pagar com VR** pelo botão +, pela edição de um gasto e pelo Atalho. Sem parcelas.
- **Onde aparece:** no Início, um card menor abaixo do saldo da conta (só no mês atual) com o saldo e o
  próximo depósito; em Lançamentos, a aba VR com o saldo, os depósitos e os gastos pagos com ele.
- **No banco:** a tabela `vr` guarda a configuração; o resto são lançamentos com `forma_pagamento = 'vr'`
  (origem `vr` para o depósito e `acerto` para o saldo inicial e as correções). O saldo é a soma deles.

## Privacidade na tela

- **Olhinho** no topo do Início e da aba Investir: troca os valores com dinheiro por "R$ ••••" (saldo,
  "Depois da fatura", Entrou, Saiu, Investiu, faturas, investimentos e o saldo do VR). Os lançamentos continuam
  visíveis. A escolha fica guardada no aparelho.
