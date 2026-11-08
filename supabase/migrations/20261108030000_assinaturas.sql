-- Assinaturas ("Todo mês" no crédito): o mesmo valor em toda fatura até o usuário parar.
-- Cada mês é um lançamento da mesma compra (compra_id), com parcela = 1, 2, 3… e parcelas vazio.
alter table public.lancamentos add column recorrente boolean not null default false;
create index lancamentos_recorrente_idx on public.lancamentos (user_id) where recorrente;
