-- "Comer fora" vira "Alimentação" e entra a categoria "Outros" (para presente, doação, avulsos).

-- Contas novas: categorias padrão atualizadas.
create or replace function public.criar_categorias_padrao()
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
    (new.id, 'Alimentação', 'despesa', 'utensils', 4),
    (new.id, 'Lazer', 'despesa', 'ticket', 5),
    (new.id, 'Saúde', 'despesa', 'heart-pulse', 6),
    (new.id, 'Outros', 'despesa', 'circle-ellipsis', 7),
    (new.id, 'Salário', 'receita', 'briefcase', 1),
    (new.id, 'Renda extra', 'receita', 'sparkles', 2);
  return new;
end;
$$;

-- "create or replace" mantém as permissões; reforça que a função não é chamável pela API.
revoke execute on function public.criar_categorias_padrao() from public, anon, authenticated;

-- Contas que já existem: renomeia (os lançamentos continuam ligados pela id) ...
update public.categorias c
   set nome = 'Alimentação'
 where c.tipo = 'despesa'
   and c.nome = 'Comer fora'
   and not exists (
     select 1 from public.categorias o where o.user_id = c.user_id and o.tipo = 'despesa' and o.nome = 'Alimentação'
   );

-- ... e cria "Outros" para quem ainda não tem.
insert into public.categorias (user_id, nome, tipo, icone, ordem)
select u.id, 'Outros', 'despesa', 'circle-ellipsis', 7
  from auth.users u
 where not exists (
   select 1 from public.categorias o where o.user_id = u.id and o.tipo = 'despesa' and o.nome = 'Outros'
 );
