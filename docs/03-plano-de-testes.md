# BlueFinance — Fase 3: Plano de testes (TDD com Playwright)

> Status: **costuras confirmadas — em execução** · 07/11/2026 · stack: Next.js + Tailwind + shadcn/ui

## Como vamos trabalhar

- **Fatias verticais.** Um teste vermelho → o mínimo de código para ficar verde → próximo teste.
  Não escrevemos todos os testes antes do código: cada fatia ensina algo que muda a próxima.
- **Testar só nas costuras combinadas** (abaixo). Testes olham para a interface pública, nunca para os detalhes internos.
- **Valores esperados vêm de exemplos escritos à mão**, não da mesma conta que o código faz.
- Tudo roda pelo runner do Playwright (`pnpm test`), em três projetos:

| Projeto | Pasta | Roda onde | Para quê |
|---|---|---|---|
| `unit` | `tests/unit` | Node, sem navegador | Regras puras: dinheiro e resumo do mês |
| `api` | `tests/api` | `request` do Playwright → rotas `/api` do Next (Supabase local por trás) | Contrato que o Atalho do iOS chama |
| `e2e-iphone` | `tests/e2e` | WebKit (motor do Safari), perfil iPhone 16 | Jornadas reais na interface |

Infra já validada: `tests/e2e/infra.spec.ts` abre o app (Next) no WebKit com perfil de iPhone 16 ✅

Progresso: fatias 1–6 ✅

## As costuras (para confirmar)

### 1. Dinheiro — `src/domain/money.ts`
Interface: `formatBRL(centavos)`, `formatSigned(centavos, tipo)`, `parseBRL(texto)`, `pushDigit(centavos, dígito)`.
Por que aqui: todo valor da tela passa por aqui; erro de vírgula/centavo é o bug mais caro de um app de finanças.

### 2. Resumo do mês — `src/domain/summary.ts`
Interface: `summarizeMonth(lançamentos, mês)` → entrou, saiu, investiu, sobrou, gastos por categoria.
Por que aqui: é a conta que a tela Início mostra; tem fronteira de mês e fuso (America/Sao_Paulo).

### 3. API do lançamento rápido — `POST /api/quick-add`, `GET /api/quick-add/categorias`
Interface: HTTP com token pessoal no header, corpo `{ categoria, descricao, valor_centavos }`.
Por que aqui: é o que o Atalho do iOS chama sem abrir o app, e fica exposto na internet.
Inclui o isolamento entre usuários (Row Level Security).

### 4. Jornadas no iPhone — a interface no WebKit
Interface: o que você vê e toca — papéis e textos acessíveis (`getByRole`, `getByLabel`), nunca classes CSS.
Componentes de UI vêm do shadcn/ui, que já entrega papéis acessíveis.
Por que aqui: garante que as telas do design kit funcionam de ponta a ponta com dados reais.

### Fora do Playwright (de propósito)
- O Atalho do iOS em si → checklist manual no iPhone.
- Visual pixel a pixel → o design kit é a referência; sem testes de screenshot na v1.
- Dynamic Island / Live Activity → fase C, com XCTest.

## Fatias, em ordem

Cada linha é **um** teste. O nome do teste é o comportamento.

**Costura 1 — Dinheiro** (`unit`)
1. formata centavos em reais: `3290` → `R$ 32,90`
2. formata milhar: `123456` → `R$ 1.234,56`
3. lê o que você digitou: `"32,90"` → `3290`; `"1.234,56"` → `123456`; `"32"` → `3200`
4. recusa texto que não é valor: `"abc"`, `""`, `"-5"`
5. mostra sinal por tipo: despesa `− R$ 32,90`, receita `+ R$ 850,00`, aporte `R$ 500,00`
6. digitação estilo caixa de banco: `3` → `R$ 0,03`, `32` → `R$ 0,32`, `3290` → `R$ 32,90`

**Costura 2 — Resumo do mês** (`unit`)
7. calcula entrou, saiu, investiu e sobrou do exemplo do design (`R$ 9.350,00 − R$ 3.631,65 − R$ 1.500,00 = R$ 4.218,35`)
8. ignora lançamentos de outro mês, respeitando o fuso de São Paulo (31/10 23h30 não entra em novembro)
9. agrupa gastos por categoria, do maior para o menor, e junta da 7ª em diante em "Outros"

**Costura 3 — API do Atalho** (`api`)
10. lista as categorias de despesa para o Atalho
11. cria um gasto com token válido e devolve o lançamento criado
12. recusa sem token ou com token inválido (401) e não cria nada
13. recusa valor inválido — zero, negativo, texto (400, mensagem em português)
14. recusa categoria que não existe (422)
15. um usuário não enxerga os lançamentos de outro

**Costura 4 — Jornadas no iPhone** (`e2e-iphone`)
16. entra com e-mail e senha do usuário de teste
17. sem lançamentos, a tela Início explica como lançar o primeiro
18. lança um gasto pelo botão + e ele aparece em Lançamentos, em "Hoje", como `− R$ 32,90`
19. depois do gasto, a tela Início atualiza "Saiu", "Sobrou" e a barra de categorias
20. lança uma receita (salário) e ela aparece como `+ R$ 8.500,00`
21. cadastra um investimento e ele aparece em Investimentos, agrupado pela instituição
22. registra um aporte e o "Investiu" do mês aumenta
23. filtra Lançamentos por Saiu / Entrou / Investiu
24. edita e exclui um lançamento
25. um gasto feito pelo Atalho (API) aparece no app

## Dados de teste

- **Supabase local** (Docker) com banco recriado e semeado antes das suítes `api` e `e2e-iphone`.
- Usuários de teste e token pessoal ficam em `supabase/seed.sql` (valores só de teste).
- Precisa do **Docker Desktop aberto** a partir da fatia 10. Ele está instalado neste Mac, mas parado.

## Comandos

```bash
pnpm test            # tudo
pnpm test:unit       # só regras puras
pnpm test:api        # contrato do Atalho
pnpm test:e2e        # jornadas no iPhone (WebKit)
```
