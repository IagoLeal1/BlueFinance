-- Cartões de crédito, forma de pagamento e compras parceladas.

create table public.cartoes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  nome text not null check (length(trim(nome)) > 0),
  dia_fechamento smallint not null check (dia_fechamento between 1 and 31),
  criado_em timestamptz not null default now()
);
create index cartoes_user_idx on public.cartoes (user_id);
alter table public.cartoes enable row level security;
create policy "cartoes: dono lê" on public.cartoes for select to authenticated using ((select auth.uid()) = user_id);
create policy "cartoes: dono cria" on public.cartoes for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "cartoes: dono altera" on public.cartoes for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "cartoes: dono apaga" on public.cartoes for delete to authenticated using ((select auth.uid()) = user_id);

-- competencia: mês em que o lançamento conta ("2026-12"). Débito/Pix: o mês da data; crédito: o da fatura.
alter table public.lancamentos
  add column forma_pagamento text check (forma_pagamento in ('debito', 'pix', 'credito')),
  add column cartao_id uuid references public.cartoes (id) on delete set null,
  add column compra_id uuid,
  add column parcela smallint check (parcela >= 1),
  add column parcelas smallint check (parcelas between 1 and 24),
  add column competencia text;

update public.lancamentos set forma_pagamento = 'debito' where tipo = 'despesa' and forma_pagamento is null;
update public.lancamentos set competencia = to_char(data at time zone 'America/Sao_Paulo', 'YYYY-MM') where competencia is null;

alter table public.lancamentos
  alter column competencia set default '',
  alter column competencia set not null,
  add constraint lancamentos_competencia_formato check (competencia ~ '^\d{4}-(0[1-9]|1[0-2])$');

create index lancamentos_user_competencia_idx on public.lancamentos (user_id, competencia);
create index lancamentos_compra_idx on public.lancamentos (compra_id) where compra_id is not null;
create index lancamentos_cartao_idx on public.lancamentos (cartao_id) where cartao_id is not null;

-- Sem competência informada (vazia), vale o mês da data (São Paulo); despesa sem forma é débito.
create function public.preencher_lancamento()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.competencia is null or new.competencia = '' then
    new.competencia := to_char(new.data at time zone 'America/Sao_Paulo', 'YYYY-MM');
  end if;
  if new.tipo = 'despesa' and new.forma_pagamento is null then
    new.forma_pagamento := 'debito';
  end if;
  return new;
end;
$$;
revoke execute on function public.preencher_lancamento() from public, anon, authenticated;

create trigger antes_de_gravar_lancamento
  before insert on public.lancamentos
  for each row execute function public.preencher_lancamento();

-- Regrava uma compra parcelada inteira (apaga as parcelas e grava as novas) numa transação só.
-- security invoker: o RLS de lançamentos vale normalmente.
create function public.regravar_compra(p_compra uuid, p_linhas jsonb)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  delete from public.lancamentos where compra_id = p_compra;
  insert into public.lancamentos
    (user_id, tipo, valor, categoria_id, descricao, data, forma_pagamento, cartao_id, compra_id, parcela, parcelas, competencia)
  select (select auth.uid()), 'despesa', l.valor, l.categoria_id, l.descricao, l.data, 'credito', l.cartao_id, p_compra, l.parcela, l.parcelas, l.competencia
    from jsonb_to_recordset(p_linhas) as l(valor bigint, categoria_id uuid, descricao text, data timestamptz, cartao_id uuid, parcela smallint, parcelas smallint, competencia text);
end;
$$;
