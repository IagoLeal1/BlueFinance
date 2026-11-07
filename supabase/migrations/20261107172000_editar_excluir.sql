-- Editar e excluir lançamentos. Quando é um aporte, o valor do investimento acompanha
-- (diferença na edição, estorno na exclusão) na mesma transação. security invoker: RLS vale.

create function public.editar_lancamento(p_id uuid, p_valor bigint, p_descricao text)
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

  update public.lancamentos set valor = p_valor, descricao = coalesce(trim(p_descricao), '') where id = p_id;
  if v_investimento is not null then
    update public.investimentos set valor_atual = greatest(0, valor_atual + (p_valor - v_antigo)) where id = v_investimento;
  end if;
end;
$$;

create function public.excluir_lancamento(p_id uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_valor bigint;
  v_investimento uuid;
begin
  delete from public.lancamentos where id = p_id returning valor, investimento_id into v_valor, v_investimento;
  if v_valor is null then
    raise exception 'lançamento não encontrado';
  end if;
  if v_investimento is not null then
    update public.investimentos set valor_atual = greatest(0, valor_atual - v_valor) where id = v_investimento;
  end if;
end;
$$;
