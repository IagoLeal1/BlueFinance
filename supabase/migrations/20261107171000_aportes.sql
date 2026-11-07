-- Aporte = lançamento do tipo investimento ligado a um investimento.
alter table public.lancamentos
  add column investimento_id uuid references public.investimentos (id) on delete set null;

-- Registra o aporte e soma no valor do investimento numa transação só.
-- security invoker: roda com as permissões de quem chama, então o RLS vale normalmente.
create function public.registrar_aporte(p_investimento uuid, p_valor bigint, p_descricao text)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_id uuid;
  v_nome text;
begin
  if p_valor is null or p_valor <= 0 then
    raise exception 'valor inválido';
  end if;

  update public.investimentos
     set valor_atual = valor_atual + p_valor
   where id = p_investimento
  returning nome into v_nome;
  if v_nome is null then
    raise exception 'investimento não encontrado';
  end if;

  insert into public.lancamentos (user_id, tipo, valor, investimento_id, descricao)
  values ((select auth.uid()), 'investimento', p_valor, p_investimento, coalesce(nullif(trim(p_descricao), ''), v_nome))
  returning id into v_id;
  return v_id;
end;
$$;
