-- Categorias de cada usuário. Toda conta nova nasce com as categorias padrão do design kit.
create table public.categorias (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  nome text not null check (length(trim(nome)) > 0),
  tipo text not null check (tipo in ('despesa', 'receita')),
  icone text not null default 'circle',
  ordem int not null default 0,
  unique (user_id, tipo, nome)
);

create index categorias_user_id_idx on public.categorias (user_id, tipo, ordem);

alter table public.categorias enable row level security;

create policy "categorias: dono lê" on public.categorias for select to authenticated using ((select auth.uid()) = user_id);
create policy "categorias: dono cria" on public.categorias for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "categorias: dono altera" on public.categorias for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "categorias: dono apaga" on public.categorias for delete to authenticated using ((select auth.uid()) = user_id);

create function public.criar_categorias_padrao()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.categorias (user_id, nome, tipo, icone, ordem) values
    (new.id, 'Moradia', 'despesa', 'house', 1),
    (new.id, 'Mercado', 'despesa', 'shopping-cart', 2),
    (new.id, 'Transporte', 'despesa', 'car', 3),
    (new.id, 'Comer fora', 'despesa', 'utensils', 4),
    (new.id, 'Lazer', 'despesa', 'ticket', 5),
    (new.id, 'Saúde', 'despesa', 'heart-pulse', 6),
    (new.id, 'Salário', 'receita', 'briefcase', 1),
    (new.id, 'Renda extra', 'receita', 'sparkles', 2);
  return new;
end;
$$;

create trigger ao_criar_usuario_criar_categorias
  after insert on auth.users
  for each row execute function public.criar_categorias_padrao();
