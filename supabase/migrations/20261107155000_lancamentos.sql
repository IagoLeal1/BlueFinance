-- Lançamentos: despesas, receitas e aportes. Valor sempre em centavos inteiros e positivo;
-- o tipo diz se é dinheiro que saiu, entrou ou foi investido.
create table public.lancamentos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  tipo text not null check (tipo in ('despesa', 'receita', 'investimento')),
  valor bigint not null check (valor > 0),
  categoria_id uuid references public.categorias (id) on delete set null,
  descricao text not null default '',
  data timestamptz not null default now(),
  criado_em timestamptz not null default now()
);

create index lancamentos_user_data_idx on public.lancamentos (user_id, data desc);

alter table public.lancamentos enable row level security;

create policy "lancamentos: dono lê" on public.lancamentos for select to authenticated using ((select auth.uid()) = user_id);
create policy "lancamentos: dono cria" on public.lancamentos for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "lancamentos: dono altera" on public.lancamentos for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "lancamentos: dono apaga" on public.lancamentos for delete to authenticated using ((select auth.uid()) = user_id);
