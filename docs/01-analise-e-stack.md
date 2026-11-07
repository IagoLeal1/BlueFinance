# BlueFinance — Fase 1: Análise e escolha de stack

> Status: **decidido — Opção B, com caminho aberto para C** · 07/11/2026
>
> **Atualização (07/11/2026):** UI em **Next.js + TypeScript + Tailwind + shadcn/ui**; Swift liberado para a parte nativa.
> A API do Atalho virou rota do próprio Next (`/api/quick-add`) em vez de Edge Function do Supabase. Ver a tabela da seção 4.
>
> Premissas assumidas até segunda ordem: uso individual, só BRL, sem importação de extrato na v1.

## 1. O que o app precisa fazer

| # | Necessidade | Prioridade |
|---|---|---|
| 1 | Lançar um gasto **sem abrir o app** (categoria, descrição, valor) | Núcleo |
| 2 | Registrar entradas: salário, renda extra, outras receitas | Núcleo |
| 3 | Acompanhar investimentos: quanto, onde (corretora/banco), tipo | Núcleo |
| 4 | Ver resumo do mês: entrou × saiu × investido, por categoria | Núcleo |
| 5 | Feedback visual no Dynamic Island | Desejável |

## 2. Restrições técnicas que mudam o desenho

### 2.1 Dynamic Island não aceita digitação
Live Activities (o que aparece no Dynamic Island) só mostram informação e aceitam **botões/toggles**.
Não existe campo de texto lá. Então "digitar categoria + descrição + valor dentro da ilha" não é possível.

O que **é** possível e chega bem perto:
- **Toque traseiro** (Ajustes › Acessibilidade › Toque › Toque traseiro › Toque duplo) ou o **Botão de Ação** do iPhone 16
  disparam um **Atalho** (Shortcuts).
- O Atalho pergunta categoria / descrição / valor em caixinhas compactas no topo da tela — sem abrir o app.
- Depois de salvar, dá para mostrar uma confirmação (ex.: "R$ 32,90 · Mercado ✓") — num app nativo isso pode
  ir para o Dynamic Island por alguns segundos.

### 2.2 Playwright não testa app iOS nativo
Playwright automatiza **navegadores** (Chromium, Firefox, WebKit). Ele não controla um app SwiftUI.
Para app nativo os testes seriam XCTest / Swift Testing / XCUITest.
Ou seja: **querer Playwright + TDD empurra a UI para tecnologia web.**

### 2.3 Ambiente atual do Mac
- Node 26.5, npm 11, pnpm, Swift 6.4 (Command Line Tools) ✅
- **Xcode não está instalado** ❌ — obrigatório para qualquer coisa nativa (Live Activity, widget, App Intent).
- Instalar no próprio iPhone sem a conta paga Apple Developer (US$ 99/ano) expira a cada **7 dias**.

## 3. Opções

### A) 100% nativo — SwiftUI + SwiftData + App Intents + ActivityKit
- ✅ Melhor experiência: Dynamic Island, widgets, Botão de Ação, offline, dados no aparelho/iCloud.
- ❌ Sem Playwright (testes em Swift Testing/XCUITest).
- ❌ Precisa Xcode + conta Apple paga para uso contínuo.

### B) Web app (PWA) + backend + Atalho do iOS
- ✅ **TDD 100% em Playwright** (UI no WebKit emulando iPhone + testes de API).
- ✅ Lançamento rápido via toque traseiro → Atalho → API. Não precisa Xcode nem conta Apple.
- ✅ Funciona no celular ("Adicionar à Tela de Início") e no computador.
- ❌ Sem Dynamic Island / Live Activity / widget nativo.
- ⚠️ Dados ficam na nuvem → autenticação e segurança precisam ser bem feitas.

### C) Híbrido — B agora, empacotado com Capacitor depois
- Mesmo código web da opção B, depois embrulhado num app iOS com Capacitor.
- Um pedaço pequeno em Swift adiciona App Intent + Live Activity (confirmação no Dynamic Island) e widget.
- ✅ Playwright cobre UI + regras + API (~90% do app); só a parte nativa usa XCTest.
- ❌ Mais peças; a parte nativa precisa Xcode + conta Apple.

## 4. Recomendação: **B agora, com caminho aberto para C**

Entrega o núcleo (lançar sem abrir o app) já na v1, mantém o TDD em Playwright como você quer,
e não desperdiça nada se depois quisermos o Dynamic Island — o mesmo backend e a mesma UI são reaproveitados.

### Stack proposta

| Camada | Escolha | Por quê |
|---|---|---|
| App | **Next.js 16 (App Router) + TypeScript** | Escolha sua; front e API no mesmo projeto, deploy direto na Vercel |
| Estilo | **Tailwind CSS v4** com os tokens do design kit | `design/scripts/build-tokens.mjs` gera `src/app/tokens.css` a partir de `design/project/tokens.json` |
| Componentes | **shadcn/ui** (base Base UI, ícones Lucide) | Variáveis do shadcn apontam para os tokens do kit em `src/app/globals.css` |
| Dados / Auth | **Supabase** (Postgres + Auth + Row Level Security) | RLS garante que só você vê seus dados |
| Lançamento rápido | **Rota do Next** `POST /api/quick-add` com token pessoal | O Atalho do iOS chama via "Obter conteúdo de URL"; sem Deno nem Edge Function à parte |
| Hospedagem | **Vercel** | Casa natural do Next |
| PWA | manifest + service worker do Next | Ícone na tela inicial, tela cheia |
| Nativo (fase C) | **Swift** — App Intent, Live Activity (Dynamic Island), widget | Embrulhando o app com Capacitor (apontando para a URL publicada) ou um app SwiftUI com WebView; precisa do Xcode |
| Testes | **Playwright**: `unit` (Node), `api` (rotas `/api`), `e2e-iphone` (WebKit, iPhone 16) | Um runner só para tudo |

Regra de ouro de dinheiro: **guardar valores em centavos (inteiro)**, nunca `float`.

## 5. Modelo de domínio (primeiro esboço)

- **Conta** — onde o dinheiro está (Nubank, carteira, conta salário…)
- **Categoria** — Mercado, Transporte, Lazer… (com ícone e cor; tipo despesa ou receita)
- **Transação** — data, valor (centavos), tipo (`despesa` | `receita`), categoria, descrição, conta
- **Fonte de renda** — Salário, Freela, Aluguel… (receitas recorrentes ou avulsas)
- **Investimento** — nome, tipo (CDB, Tesouro, ações, FII, cripto…), instituição ("onde"), valor aplicado, valor atual
- **Movimento de investimento** — aporte, resgate, rendimento (data + valor)

## 6. Fluxo do lançamento rápido (v1)

```
Toque duplo nas costas
  → Atalho "Gasto rápido"
    → Escolher categoria (lista)
    → Descrição (texto)
    → Valor (número)
    → POST /api/quick-add  { categoria, descricao, valor_centavos }  + token
  → Notificação "R$ 32,90 · Mercado ✓"
```

## 7. Pontos em aberto
1. Escolha final da opção (A, B ou C).
2. Só você vai usar, ou outras pessoas (ex.: finanças do casal)?
3. Só Real (BRL) ou também outras moedas?
4. Importar extrato do banco (OFX/CSV) entra na v1 ou fica para depois?

## 8. Próximas fases
1. ~~Análise e stack~~ ← aqui
2. Design kit: cores, tipografia, componentes, telas principais
3. Testes Playwright (TDD — vermelho primeiro)
4. Desenvolvimento
