# Open Finance (Meu Pluggy)

O banco confere o que você lançou e traz o que faltou (design kit: tela 31; regras em `decisoes.md`, seção
"Open Finance (Meu Pluggy)"). Código: regras em `src/domain/banco.ts`, busca em `src/server/banco.ts`, agendamento
em `src/app/api/banco/route.ts` (`vercel.json`), telas em `src/components/app/para-conferir.tsx` e
`banco-ajustes.tsx`.

## Passos do dono (uma vez)

1. **meu.pluggy.ai:** crie a conta e conecte o banco (C6: conta e cartão) pelo Open Finance. A autorização vale
   1 ano; depois, renove lá.
2. **dashboard.pluggy.ai** (mesmo e-mail): crie uma aplicação e ative o conector **MeuPluggy**. Pelo Demo da
   aplicação, conecte o Meu Pluggy e copie o **itemId** (o "código da conexão"). O itemId não é segredo.
3. **Vercel › BlueFinance › Settings › Environment Variables** (Production): `PLUGGY_CLIENT_ID` e
   `PLUGGY_CLIENT_SECRET`, da aplicação na Pluggy. Depois, faça um Redeploy. O Client Secret fica só com você.
4. **BlueFin › Ajustes › Banco (Open Finance):** cole o código da conexão e toque em Conectar. A primeira busca
   roda na hora; dali em diante, todo dia às 7h.

## Como funciona

- A busca usa `POST /auth`, `GET /items/{itemId}`, `GET /accounts?itemId=` e `GET /v2/transactions` (com
  cursor) da API da Pluggy. `PLUGGY_URL` troca o endereço (os testes usam a Pluggy de mentira em
  `tests/support/pluggy-falso.mjs`, iniciada pelo Playwright na porta 3199).
- Rodar a busca na mão (com o `CRON_SECRET`, que só o dono tem):

```bash
curl -H "Authorization: Bearer $CRON_SECRET" https://bluefinance-chi.vercel.app/api/banco
```

- Problemas (autorização vencida, chave errada, conexão que sumiu) aparecem em Ajustes › Banco, com o campo para
  conectar de novo.

## Diagnóstico

`bancos.ultima_busca` guarda, por conta, o que a Pluggy mandou na última busca: `recebidas` (de `desde` em diante),
`aproveitadas` (as que entram no app), `antes` (na semana anterior à conexão, só para saber se o banco tem
transações) e `maisRecente` (o dia da transação mais nova). Só contagens e datas. Se `recebidas` é 0 e `maisRecente`
é de antes de `desde`, o banco ainda não mandou as transações novas (o Open Finance pode levar mais de um dia).
