-- Editar lançamento passa a aceitar a troca de categoria (ex.: o Atalho foi para a categoria errada).
drop function public.editar_lancamento(uuid, bigint, text);

create function public.editar_lancamento(p_id uuid, p_valor bigint, p_descricao text, p_categoria uuid default null)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_antigo bigint;
  v_investimento uuid;
begin
  if p_valor is null or p_valor <= 0 then
    raise exception 'valor inválido';
  end if;
  select valor, investimento_id into v_antigo, v_investimento from public.lancamentos where id = p_id;
  if v_antigo is null then
    raise exception 'lançamento não encontrado';
  end if;

  update public.lancamentos
     set valor = p_valor,
         descricao = coalesce(trim(p_descricao), ''),
         categoria_id = coalesce(p_categoria, categoria_id)
   where id = p_id;
  if v_investimento is not null then
    update public.investimentos set valor_atual = greatest(0, valor_atual + (p_valor - v_antigo)) where id = v_investimento;
  end if;
end;
$$;
