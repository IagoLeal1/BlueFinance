-- Categoria "Fatura": o total de uma fatura lançado sem detalhe ("Lançar o total da fatura").
-- Fica separada das outras nos gastos por categoria (listrada, sem cor própria) e fora do botão + e do Atalho.

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
    (new.id, 'Fatura', 'despesa', 'credit-card', 8),
    (new.id, 'Salário', 'receita', 'briefcase', 1),
    (new.id, 'Renda extra', 'receita', 'sparkles', 2);
  return new;
end;
$$;
revoke execute on function public.criar_categorias_padrao() from public, anon, authenticated;

-- Contas que já existem.
insert into public.categorias (user_id, nome, tipo, icone, ordem)
select u.id, 'Fatura', 'despesa', 'credit-card', 8
  from auth.users u
 where not exists (select 1 from public.categorias c where c.user_id = u.id and c.tipo = 'despesa' and c.nome = 'Fatura');

-- Totais de fatura já lançados como Outros passam para Fatura.
update public.lancamentos l
   set categoria_id = f.id
  from public.categorias o, public.categorias f
 where l.categoria_id = o.id
   and o.tipo = 'despesa' and o.nome = 'Outros'
   and f.user_id = l.user_id and f.tipo = 'despesa' and f.nome = 'Fatura'
   and l.forma_pagamento = 'credito' and l.parcelas = 1 and l.descricao ~ '^Fatura de ';
