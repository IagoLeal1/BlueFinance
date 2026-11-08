# Atalho do iOS — contrato da API

O Atalho "Gasto rápido" roda pelo Botão de Ação (Ajustes › Botão de Ação › Atalho) e lança um gasto sem abrir o app.

Endereço de produção: **https://bluefinance-chi.vercel.app** — as rotas abaixo são relativas a ele.

## Autenticação

Todo pedido leva o **token pessoal** no header:

```
Authorization: Bearer bf_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

O token é gerado no app em **Ajustes › Atalho do iPhone** e aparece uma única vez (botão Copiar). No banco fica só o hash.
Só existe um token ativo: gerar outro desliga o anterior — use isso se o iPhone for perdido.

## `GET /api/quick-add/categorias`

```json
{ "categorias": ["Moradia", "Mercado", "Transporte", "Alimentação", "Lazer", "Saúde", "Outros"] }
```

## `GET /api/quick-add/formas?categoria=Transporte`

"Como pagou?": Débito, Pix e cada cartão cadastrado em Ajustes. A forma usada por último naquela categoria vem primeiro.

```json
{ "formas": ["Crédito · Nubank", "Débito", "Pix", "Crédito · Itaú"] }
```

## `POST /api/quick-add`

Pedido (Atalho com teclado numérico):

```json
{ "categoria": "Mercado", "valor": 32.9, "descricao": "mercado do bairro" }
```

- `valor`: em reais, como vem do "Pedir Número" (32.9). A API arredonda para centavos.
- `descricao`: opcional; vazia usa o nome da categoria.
- `forma`: opcional; um item da lista de `/formas` ("Débito", "Pix", "Crédito · Nubank"). Sem `forma` vale Débito. No crédito a compra cai na fatura pelo dia de fechamento do cartão.
- `parcelas`: opcional, só no crédito; 1 a 24, número ou texto ("3"). Vazio é à vista. No Débito e no Pix é ignorado.
- Também aceitos: `{ "categoria", "texto": "32,90 mercado do bairro" }` (valor + descrição num campo) e `{ "categoria", "descricao", "valor_centavos" }`.

Respostas — **toda resposta traz `mensagem`**, que o Atalho mostra numa notificação:

| Status | Quando | `mensagem` |
|---|---|---|
| 201 | gasto criado | "Gasto salvo: Mercado · − R$ 32,90" |
| 201 | gasto no crédito | "Gasto salvo: Transporte · − R$ 18,40 no crédito (Nubank, fatura de dezembro)" |
| 201 | parcelado | "Gasto salvo: Lazer · − R$ 1.200,00 em 3x no crédito (Nubank, 1ª na fatura de dezembro)" |
| 400 | parcelas fora de 1 a 24 | "Em quantas vezes? Use um número de 1 a 24." |
| 400 | texto sem valor | "Não achei o valor. Escreva assim: 32,90 mercado" |
| 401 | sem token / token inválido | "Token inválido. Gere um novo em Ajustes." |
| 422 | categoria não existe | "Categoria de despesa não encontrada. Atualize a lista no Atalho." |
| 422 | forma fora da lista (ex.: cartão excluído) | "Forma de pagamento não encontrada. Atualize a lista no Atalho." |

## Passos do Atalho (disparado pelo Botão de Ação)

1. **Texto** → o token pessoal.
2. **Obter Conteúdo de URL** → `GET /api/quick-add/categorias`, cabeçalho `Authorization: Bearer` + Texto.
3. **Obter Valor do Dicionário** `categorias` → **Escolher na Lista**.
4. **Pedir Entrada** (Número) → "Quanto?" — abre o teclado numérico.
5. **Pedir Entrada** (Texto) → "Com o quê?" — pode deixar vazio.
6. **Obter Conteúdo de URL** → `GET /api/quick-add/formas?categoria=` + Item Selecionado, mesmo cabeçalho.
7. **Obter Valor do Dicionário** `formas` → **Escolher na Lista** ("Como pagou?").
8. **Se** a forma escolhida **contém** "Crédito" → **Pedir Entrada** (Número) "Em quantas vezes?" → **Fim do Se**.
9. **Obter Conteúdo de URL** → `POST /api/quick-add`, mesmo cabeçalho, JSON: `categoria` (Texto) = categoria escolhida, `valor` (Número) = resposta de "Quanto?", `descricao` (Texto) = resposta de "Com o quê?", `forma` (Texto) = forma escolhida, `parcelas` (Texto) = resposta de "Em quantas vezes?" (vazia quando não é crédito).
10. **Obter Valor do Dicionário** `mensagem` → **Mostrar Notificação**.

No iPhone: Ajustes › Botão de Ação › Atalho › Gasto rápido (o Toque Traseiro falha com capinha).

Contrato coberto por `tests/api/quick-add.spec.ts` e `tests/api/quick-add-formas.spec.ts`.
