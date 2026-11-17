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
| App do iPhone (nativo) | `docs/06-app-ios.md`, código em `ios/` |
| Open Finance (Meu Pluggy) | `docs/07-open-finance.md` |
| Apple Pay (automação da Carteira) | `docs/08-apple-pay.md` |

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
- **Filtro por categoria em Lançamentos** (tela 28): uma fileira de categorias em cima das abas. A categoria
  **filtra a aba aberta** e as abas continuam (pedido do dono em 12/11/2026, depois de usar a 1ª versão, que
  misturava tudo e escondia as abas): no Crédito, só as compras dela nas faturas do mês, com o total da fatura
  refeito; no Débito, só os gastos dela na conta; no VR, só os pagos com VR. No topo, quanto foi a categoria
  naquela aba e quanto ela soma no mês somando tudo (o mesmo número de "Gastos por categoria" do Início).
  Trocar de aba mantém a categoria; somem pagamento de fatura, "A pagar", depósito e acerto do VR. Só aparecem
  categorias com gasto no mês, na ordem do app; a troca é no aparelho. No Início, tocar numa categoria de
  "Gastos por categoria" abre Lançamentos já filtrado.

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

## Open Finance (Meu Pluggy)

Pedido do dono em 17/11/2026 (tela 31). Guia e passos do dono em `docs/07-open-finance.md`.

- **Meu Pluggy, só leitura, uso pessoal.** O dono conecta o banco em meu.pluggy.ai; o BlueFin lê pelo app dele na
  Pluggy (Client ID e Client Secret só na Vercel, com o dono). Em Ajustes › Banco cola-se o **código da conexão**
  (itemId) uma vez.
- **Daqui para frente:** importa só transações do dia da conexão em diante (`bancos.desde`). O que já estava no
  app antes não é tocado. Reconectar recomeça do dia da reconexão.
- **Quando busca:** uma vez por dia (agendamento da Vercel, `/api/banco`, 07h de Brasília), ao conectar e, sem
  segurar a tela, ao abrir Lançamentos se a última busca tem mais de 3 horas. O próprio Meu Pluggy só atualiza a
  cada 24 horas.
- **Conferir sem duplicar:** cada transação nova é comparada com os lançamentos: mesmo valor, mesma conta (débito
  e Pix valem igual), até 3 dias de diferença, o mais perto ganha. No cartão, a 1ª parcela da compra no mesmo
  número de vezes (a sobra da divisão fica na 1ª); assinatura bate com a do mês. Bateu → "conferido", e o
  lançamento mostra "✓ banco".
- **Categoria aprendida por estabelecimento** (a descrição do banco em maiúsculas, sem acento e sem números): ao
  lançar algo de "Para conferir", a categoria e o "com o quê" ficam guardados (`regras_banco`); da próxima vez o
  mesmo estabelecimento vira lançamento sozinho (origem `banco`, "do banco" na lista).
- **Aprender com tudo** (pedido do dono em 17/11/2026): quando o banco confere um gasto que você lançou (pelo
  Atalho, pelo app ou pelo Apple Pay confirmado), aquele estabelecimento aprende a categoria e o nome desse gasto,
  se ainda não tinha. O que está "a confirmar" e o que o próprio banco lançou não ensinam.
- **Para conferir** (topo do Débito e do Crédito em Lançamentos): o que não bateu nem é conhecido, com a categoria
  sugerida (a da Pluggy traduzida; gasto sem par vai em Outros; receita só sugere Salário). Lançar em um toque,
  Ignorar, ou tocar para trocar categoria e "com o quê". Some quando há categoria no filtro.
- **Fica de fora:** pagamento de fatura (a fatura já aparece no vencimento), pagamento e estorno no cartão,
  parcelas seguintes de compra parcelada (a 1ª já lança todas), transferência para si mesmo e investimentos (os
  aportes são lançados no app).
- **Crédito:** a compra vai para o cartão do app de nome parecido com o do banco; senão o primeiro cartão.
- **No banco:** `bancos` (a conexão, o último problema em `erro`), `transacoes_banco` (cada transação e a situação:
  conferir, conferido, lancado, ignorado; só a busca grava) e `regras_banco`.

## Apple Pay

Pedido do dono em 17/11/2026 (tela 32). Guia e passos em `docs/08-apple-pay.md`.

- **Automação "Carteira" do Atalhos**: no iOS do dono, o gatilho "Quando qualquer cartão for aproximado" é o 1º bloco
  do atalho "BlueFin · Apple Pay" (montado em 17/11/2026). Ao encostar o iPhone ou o Watch, o atalho manda valor,
  comerciante e cartão para `POST /api/apple-pay` (token do Atalho) e mostra a notificação de volta. Nada para
  tocar. Só pega Apple Pay na maquininha; o resto vem pelo banco.
- **Cartões da Carteira:** o dono usa C6 no débito, C6 no crédito e VR. Cada cartão aparece em Ajustes › Apple Pay
  no primeiro pagamento, com a forma adivinhada pelo nome ("Crédito" → crédito no cartão do app de nome parecido;
  VR, Alelo, Pluxee… → VR; senão débito), e o dono troca ali. Crédito sem cartão no app, ou VR sem VR configurado,
  entra como débito.
- **Lugar conhecido** (a mesma tabela `regras_banco`, com a chave do nome do lugar): entra com a categoria e o nome
  aprendidos. **Lugar novo:** entra na hora em Outros, **já conta no mês**, marcado "a confirmar"
  (`lancamentos.a_confirmar`), e aparece em Para conferir com **Confirmar** (tocar na linha troca categoria e
  nome). Confirmar, ou editar o gasto, ensina o lugar.
- **Sem duplicar:** se você lançou o mesmo valor e forma pelo Atalho nos últimos 30 minutos, o Apple Pay só
  confere, e o lugar aprende a sua categoria e o seu nome. A automação rodando duas vezes (mesmo lugar e valor em
  2 minutos) não grava de novo. No dia seguinte, o banco confere o gasto do Apple Pay ("✓ banco").
- **Para conferir** aparece em todas as abas de Lançamentos (o gasto do VR também precisa de confirmação).

## Privacidade na tela

- **Olhinho** no topo do Início e da aba Investir: troca os valores com dinheiro por "R$ ••••" (saldo,
  "Depois da fatura", Entrou, Saiu, Investiu, faturas, investimentos e o saldo do VR). Os lançamentos continuam
  visíveis. A escolha fica guardada no aparelho.

## Próximas mudanças (combinadas, ainda não feitas)

### Lançar sozinho: Apple Pay + Open Finance (combinado em 17/11/2026)

Objetivo do dono: não precisar usar o Atalho toda hora. Segue o fluxo de sempre (design, aprovação, código).

- **Apple Pay, na hora:** automação "Transação" (iOS 17 a 25; "Carteira" no iOS 26) no app Atalhos, com
  "Executar Imediatamente". Ao pagar encostando o iPhone ou o Watch, manda valor, estabelecimento e cartão para a
  API; o cartão diz a forma (C6 crédito → crédito; VR na Carteira → VR). Só pega Apple Pay. Depois de atualizar o
  iOS ela pode voltar para "Perguntar antes de executar".
- **Open Finance pelo Meu Pluggy, no dia seguinte:** **feito em 17/11/2026** (ver "Open Finance (Meu Pluggy)",
  acima). O Apple Pay também foi **feito em 17/11/2026** (ver "Apple Pay", acima). Gratuito só para uso pessoal (até 5 conexões), atualiza a
  cada 24 horas (sem atualização na hora), traz os últimos 7 dias, autorização vale 1 ano. Pega Pix, débito,
  cartão físico e compras online. Leitura apenas. O Client Secret da Pluggy fica só com o dono (Vercel).
- **Sem duplicar:** o gasto que já entrou (Apple Pay ou Atalho) é reconhecido pelo valor, data próxima e forma, e
  fica "conferido"; o resto vai para uma lista "Para conferir".
- **Categoria aprendida por estabelecimento:** na primeira vez o dono diz que "UBER *TRIP" é Transporte; depois
  é automático (a sugestão da Pluggy ajuda). Só estabelecimento novo vai para "Para conferir".
- **O Atalho vira exceção:** dinheiro vivo, ou quando quiser categorizar na hora.
- Se outras pessoas passarem a usar o app, o Meu Pluggy deixa de valer (uso comercial é plano pago).

### O BlueFin vira app nativo, um app só (combinado em 17/11/2026)

> **Testado e deixado de lado em 17/11/2026.** O dono instalou, usou e não gostou; voltou ao PWA + Atalho
> (a decisão de Plataforma, acima, vale de novo). O código fica em `ios/`, parado. A API que ele usa (`/api/resumo`,
> desfazer, `id` no POST para não duplicar) continua no ar e não atrapalha o site nem o Atalho.

O dono baixou o Xcode e quer o Gasto rápido com Dynamic Island e animações, tudo **no próprio BlueFin**, sem um
segundo app. Muda a decisão "sem app nativo" (acima, em Plataforma). Telas 29 e 30 no design kit.

- **Um app só:** uma casca nativa (Swift) que abre as telas que já existem (o mesmo site, a mesma API e o mesmo
  Supabase) e soma as partes nativas: Gasto rápido em tela própria pelo Botão de Ação, confirmação na **Dynamic
  Island** (Live Activity iniciada pelo próprio app, sem push) com "Desfazer", e **widgets** de saldo, VR e fatura.
  O ícone do BlueFin na Tela de Início passa a ser o app; o site continua no ar como reserva.
- **Conta gratuita (Personal Team no Xcode), sem App Store e sem pagar.** O app vence a cada 7 dias e é
  reinstalado pelo Xcode (cabo ou Wi-Fi); sem push e sem iCloud; só no iPhone do dono. Se vencer, o site no Safari
  continua funcionando.
- **Aviso da fatura:** dentro do app nativo o Web Push não funciona; vira notificação agendada no próprio iPhone.
- A Dynamic Island continua sem aceitar digitação: ela confirma, não pergunta.
- Depois, se valer a pena: Siri, controle na Central de Controle, Face ID.
- **Dois comandos para o Botão de Ação:** "Lançar gasto" não abre o app (as perguntas são as do iOS: categoria,
  quanto, como pagou e, no crédito, em quantas vezes; sem "com o quê", para ser mais rápido) e confirma na Dynamic
  Island; "Gasto rápido" abre a tela própria do app, com teclado e animações. Pedido do dono: mais rápido sem abrir.
- **Feito em 17/11/2026** (código em `ios/`, guia em `docs/06-app-ios.md`). O teclado do Gasto rápido tem "00" no
  lugar da vírgula (o valor entra pela direita, como na maquininha). O olhinho não chega aos widgets: cada widget tem
  "Esconder valores" na edição.
