# Atalho do iOS — contrato da API

O Atalho "Gasto rápido" roda pelo toque duplo nas costas (Ajustes › Acessibilidade › Toque › Toque traseiro) e lança um gasto sem abrir o app.

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
{ "categorias": ["Moradia", "Mercado", "Transporte", "Comer fora", "Lazer", "Saúde"] }
```

## `POST /api/quick-add`

Pedido (Atalho de 2 passos):

```json
{ "categoria": "Mercado", "texto": "32,90 mercado do bairro" }
```

- `texto`: o primeiro número é o valor ("32,90", "32.90", "1.250", "41"); o resto é a descrição. Sem descrição, usa o nome da categoria.
- Formato antigo, ainda aceito: `{ "categoria", "descricao", "valor_centavos" }`.

Respostas — **toda resposta traz `mensagem`**, que o Atalho mostra numa notificação:

| Status | Quando | `mensagem` |
|---|---|---|
| 201 | gasto criado | "Gasto salvo: Mercado · − R$ 32,90" |
| 400 | texto sem valor | "Não achei o valor. Escreva assim: 32,90 mercado" |
| 401 | sem token / token inválido | "Token inválido. Gere um novo em Ajustes." |
| 422 | categoria não existe | "Categoria de despesa não encontrada. Atualize a lista no Atalho." |

## Passos do Atalho (disparado pelo Botão de Ação)

1. **Texto** → o token pessoal.
2. **Obter Conteúdo de URL** → `GET /api/quick-add/categorias`, cabeçalho `Authorization: Bearer` + Texto.
3. **Obter Valor do Dicionário** `categorias` → **Escolher na Lista**.
4. **Pedir Entrada** (texto) → "Quanto e com o quê?".
5. **Obter Conteúdo de URL** → `POST /api/quick-add`, mesmo cabeçalho, JSON: `categoria` = Item Selecionado, `texto` = Entrada Fornecida.
6. **Obter Valor do Dicionário** `mensagem` → **Mostrar Notificação**.

No iPhone: Ajustes › Botão de Ação › Atalho › Gasto rápido (o Toque Traseiro falha com capinha).

Contrato coberto por `tests/api/quick-add.spec.ts`.
