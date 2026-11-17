# App do iPhone (BlueFin nativo)

O BlueFin como app nativo, um app só: as telas do site dentro do app e, por cima, o Gasto rápido pelo Botão de Ação,
a confirmação na Dynamic Island e os widgets (design kit: telas 29 e 30; decisão em `decisoes.md`).

- Código em `ios/` (projeto do Xcode `ios/BlueFin.xcodeproj`): `App/` (o app), `Widgets/` (widgets e Dynamic
  Island) e `Comum/` (o que os dois usam: a API, as cores e a confirmação).
- O app fala com a mesma API do site, com o **token do Atalho** (`Authorization: Bearer bf_…`):
  `GET /api/quick-add/categorias` (com `itens`: nome, ícone e ordem), `GET /api/quick-add/formas`,
  `POST /api/quick-add` (devolve `desfazer` e, no VR, `vr.saldo`), `POST /api/quick-add/desfazer` e `GET /api/resumo`.
- Conta gratuita da Apple (Personal Team): sem App Store e sem pagar. O app **vence a cada 7 dias** e é reinstalado
  pelo Xcode. Sem push e sem iCloud: o aviso da fatura é agendado no próprio iPhone.

## Primeira instalação (passos seus)

1. **Xcode › Settings › Accounts:** entre com o seu Apple ID. Aparece o time "Seu Nome (Personal Team)".
2. **Segredos:** copie `ios/Segredos.exemplo.xcconfig` para `ios/Segredos.xcconfig` (fica fora do git) e preencha:
   - `BLUEFIN_TEAM`: o ID do Personal Team (Xcode › Settings › Accounts › o time; ou abra o projeto, alvo BlueFin ›
     Signing & Capabilities › Team, e veja o ID no erro/na tela).
   - `BLUEFIN_BUNDLE_ID`: um identificador seu, por exemplo `com.seunome.bluefin`.
   - `BLUEFIN_TOKEN`: o token do Atalho (BlueFin › Ajustes › Token do Atalho). É o mesmo do Atalho; não gere outro,
     senão o Atalho para de funcionar.
3. **iPhone no cabo**, "Confiar neste computador". No iPhone: Ajustes › Privacidade e Segurança › **Modo de
   Desenvolvedor** › ligar e reiniciar.
4. **Abrir** `ios/BlueFin.xcodeproj`, escolher o iPhone lá em cima e **Run** (⌘R).
5. **Na primeira abertura**, o iPhone bloqueia: Ajustes › Geral › VPN e Gerenciamento de Dispositivos › o seu e-mail
   › Confiar. Abra o BlueFin e entre com o seu e-mail e senha (é o mesmo site, dentro do app).
6. **Botão de Ação:** Ajustes do iPhone › Botão de Ação › Atalho › escolha **BlueFin › Lançar gasto** (sem abrir o
   app: o iOS pergunta categoria, quanto e como pagou) ou **BlueFin › Gasto rápido** (abre a tela própria do app).
7. **Widgets:** segure a Tela de Início › Editar › Adicionar widget › BlueFin. Na Tela Bloqueada: VR e Fatura.
8. Pode apagar o ícone antigo do BlueFin (o do Safari): o app novo já abre o site.

## Toda semana (renovar)

Com o iPhone no mesmo Wi-Fi do Mac (ou no cabo), abra o projeto no Xcode e dê **Run** — ou, no terminal:

```bash
cd ios && xcodebuild -project BlueFin.xcodeproj -scheme BlueFin -destination 'generic/platform=iOS' -allowProvisioningUpdates build
```

e instale pelo Xcode (Window › Devices and Simulators). Não apague o app antes: reinstalar por cima mantém tudo.
Se vencer, o site no Safari continua funcionando.

## Como funciona

- **Gasto rápido:** o Botão de Ação roda o comando "Gasto rápido" do app (App Intent), que abre o app direto no
  teclado. Categorias e formas vêm da API e ficam guardadas no aparelho, para abrir na hora; a última categoria e a
  última forma usada nela vêm marcadas.
- **Confirmação:** ao salvar, a confirmação aparece no próprio app (com o app aberto o iOS não mostra a Dynamic Island
  do próprio app) e, ao sair dele, na **Dynamic Island** e na Tela Bloqueada, por alguns segundos (Live Activity
  iniciada pelo app, sem push). "Desfazer" apaga o gasto (só lançamentos do Atalho/app, do dono do token).
- **Widgets:** buscam `GET /api/resumo` a cada gasto salvo e algumas vezes por dia. O olhinho do site não chega aos
  widgets: cada widget tem "Esconder valores" na edição dele.
- **Aviso da fatura:** ao abrir o app, ele agenda no iPhone os avisos de um dia antes e do dia do vencimento, às 9h.

## Testar no simulador (com o servidor local)

Com o Supabase local e `pnpm next dev --port 3100` rodando, um usuário de teste e o token dele, o app pode apontar
para o servidor local sem mexer no código (o `BLUEFIN_SITE` só vale nessa compilação):

```bash
cd ios && xcodebuild -project BlueFin.xcodeproj -scheme BlueFin -destination 'platform=iOS Simulator,name=iPhone 16' -derivedDataPath build BLUEFIN_SITE=http://localhost:3100 BLUEFIN_TOKEN=bf_token_de_teste build
```

## Conferir que compila (sem iPhone)

```bash
cd ios && xcodebuild -project BlueFin.xcodeproj -scheme BlueFin -destination 'generic/platform=iOS' -derivedDataPath build CODE_SIGNING_ALLOWED=NO build
```
