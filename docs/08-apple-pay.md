# Apple Pay (automação "Carteira" do Atalhos)

Ao encostar o iPhone ou o Watch na maquininha, o gasto entra sozinho no BlueFin (design kit: tela 32; regras em
`decisoes.md`, seção "Apple Pay"). Código: regras em `src/domain/apple-pay.ts`, rota em
`src/app/api/apple-pay/route.ts`, cartões da Carteira em `src/server/apple-pay.ts`, telas em
`src/components/app/para-conferir.tsx` e `apple-pay-ajustes.tsx`.

## `POST /api/apple-pay`

Mesmo token do Atalho (`Authorization: Bearer bf_…`, ver `04-atalho-ios.md`). Corpo JSON:

| Campo | Exemplo | O que é |
|---|---|---|
| `valor` | `8.5` ou `"R$ 8,50"` | valor do pagamento (número em reais ou o texto como o iPhone mostra) |
| `lugar` | `"Padaria Real"` | nome do lugar (Estabelecimento, na Carteira) |
| `cartao` | `"C6 Débito"` | nome do cartão na Carteira |

Resposta: `{ "mensagem": "…" }`, a notificação que o Atalho mostra.

| Status | Quando | `mensagem` |
|---|---|---|
| 201 | lugar conhecido | "Gasto salvo: Mercado · Atacadão · − R$ 187,40" (+ " no crédito (C6bank, fatura de dezembro)" ou " no VR (sobram R$ …)") |
| 201 | lugar novo | "Lugar novo: Padaria Real · − R$ 8,50 em Outros. Confirme em Lançamentos." |
| 200 | já lançado pelo Atalho nos últimos 30 min | "Já estava lançado: Alimentação · Almoço · − R$ 32,90" |
| 200 | a automação rodou de novo (mesmo lugar e valor em 2 min) | "Gasto salvo: …" (não grava de novo) |
| 400 | valor ilegível | "Não achei o valor do pagamento." |
| 401 | sem token / token inválido | "Token inválido. Gere um novo em Ajustes." |

Contrato coberto por `tests/api/apple-pay.spec.ts`.

## Montar no iPhone (uma vez)

Montado em 17/11/2026 no iPhone do dono. Nesta versão do iOS o gatilho da automação é o **primeiro bloco do próprio
atalho** (o + da aba Automação cria um atalho). Atalho **"BlueFin · Apple Pay"** (app Atalhos › +, "Editar" para
montar à mão):

1. **Gatilho:** busca › categoria **Automação** › **Carteira**: "Quando **Qualquer Cartão** for aproximado"
   (Categorias e Comerciantes: qualquer; **Automação** ligada; Notificar desligado). Ele entrega a variável
   **Transação**.
2. **Texto** → o token do Atalho (o mesmo do "Gasto rápido"; quem cola é o dono).
3. **Obter Conteúdo do URL** → `https://bluefinance-chi.vercel.app/api/apple-pay`, Método **POST**, Cabeçalho
   `Authorization` = `Bearer ` + Texto, Corpo **JSON** (campos de Texto):
   - `valor` = Transação › **Valor**
   - `lugar` = Transação › **Comerciante**
   - `cartao` = Transação › **Cartão ou Tíquete**
4. **Obter Valor do Dicionário** `mensagem` em Conteúdos do URL → **Mostrar Notificação** (Valor do Dicionário).

Em versões mais antigas (iOS 17 a 18), o mesmo vai numa automação "Transação" da aba Automação, com "Executar
Imediatamente" e as mesmas ações. Na primeira vez, o iPhone pergunta se o atalho pode acessar o BlueFin: toque em
**Sempre Permitir**.

**3. Ajustes › Apple Pay**, depois do primeiro pagamento com cada cartão: confira como cada um entra (C6 Débito →
Débito; C6 Crédito → Crédito, na fatura do C6bank; VR → VR).

## Limites

- Só pega pagamento encostando o iPhone ou o Watch. Pix, Uber (cartão cadastrado no app), compra online e cartão
  físico chegam pelo banco, no dia seguinte (Open Finance, `07-open-finance.md`).
- Se a notificação da Carteira atrasar, o iOS às vezes não roda a automação. O banco cobre no dia seguinte.
- Se o C6 for um cartão só na Carteira (débito e crédito juntos), a automação não sabe qual função foi usada: vale
  a forma escolhida em Ajustes, e o banco traz a outra para conferir.
