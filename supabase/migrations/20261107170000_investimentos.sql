-- Investimentos: onde o dinheiro está aplicado e quanto vale hoje (valor informado por você).
create table public.investimentos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  nome text not null check (length(trim(nome)) > 0),
  tipo text not null check (tipo in ('Renda fixa', 'Ações', 'FII', 'Cripto', 'Outro')),
  instituicao text not null check (length(trim(instituicao)) > 0),
  valor_atual bigint not null default 0 check (valor_atual >= 0),
  criado_em timestamptz not null default now()
);

create index investimentos_user_idx on public.investimentos (user_id, instituicao);

alter table public.investimentos enable row level security;

create policy "investimentos: dono lê" on public.investimentos for select to authenticated using ((select auth.uid()) = user_id);
create policy "investimentos: dono cria" on public.investimentos for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "investimentos: dono altera" on public.investimentos for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "investimentos: dono apaga" on public.investimentos for delete to authenticated using ((select auth.uid()) = user_id);
