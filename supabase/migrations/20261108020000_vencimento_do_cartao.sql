-- Dia do vencimento da fatura: até quando a fatura fechada aparece como "a pagar".
-- Se o vencimento é antes do fechamento (fecha 25, vence 5), vence no mês seguinte.
alter table public.cartoes add column dia_vencimento smallint check (dia_vencimento between 1 and 31);

-- Cartões já cadastrados: uma semana depois do fechamento (o usuário confere em Ajustes).
update public.cartoes set dia_vencimento = ((dia_fechamento + 6) % 31) + 1 where dia_vencimento is null;
