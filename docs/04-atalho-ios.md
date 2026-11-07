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

Pedido:

```json
{ "categoria": "Mercado", "descricao": "Mercado do bairro", "valor_centavos": 3290 }
```

- `valor_centavos`: número inteiro maior que zero. No Atalho: valor digitado × 100, arredondado.
- `descricao`: opcional; vazio usa o nome da categoria.

Respostas:

| Status | Quando | Corpo |
|---|---|---|
| 201 | gasto criado | `{ "mensagem": "Gasto salvo: Mercado · − R$ 32,90", "lancamento": { … } }` |
| 400 | valor inválido | `{ "erro": "O valor precisa ser um número inteiro de centavos maior que zero." }` |
| 401 | sem token / token inválido | `{ "erro": "Token inválido. Gere um novo em Ajustes." }` |
| 422 | categoria não existe | `{ "erro": "Categoria de despesa não encontrada. Atualize a lista no Atalho." }` |

O Atalho mostra `mensagem` (ou `erro`) numa notificação.

## Passos do Atalho

1. Obter conteúdo de URL → `GET /api/quick-add/categorias` com o header de autorização.
2. Escolher da lista → `categorias`.
3. Pedir entrada (texto) → "Com o quê?".
4. Pedir entrada (número) → "Quanto?"; Calcular × 100; Arredondar.
5. Obter conteúdo de URL → `POST /api/quick-add` (JSON) com os três campos.
6. Mostrar notificação → `mensagem` ou `erro`.

Contrato coberto por `tests/api/quick-add.spec.ts`.
