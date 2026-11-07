-- Quanto foi aportado em cada investimento (valor inicial + aportes). Rendeu = valor_atual − aportado.
alter table public.investimentos add column aportado bigint not null default 0 check (aportado >= 0);
update public.investimentos set aportado = valor_atual where aportado = 0;

create or replace function public.registrar_aporte(p_investimento uuid, p_valor bigint, p_descricao text)
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
     set valor_atual = valor_atual + p_valor,
         aportado = aportado + p_valor
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

create or replace function public.editar_lancamento(p_id uuid, p_valor bigint, p_descricao text, p_categoria uuid default null)
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
    update public.investimentos
       set valor_atual = greatest(0, valor_atual + (p_valor - v_antigo)),
           aportado = greatest(0, aportado + (p_valor - v_antigo))
     where id = v_investimento;
  end if;
end;
$$;

create or replace function public.excluir_lancamento(p_id uuid)
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
    update public.investimentos
       set valor_atual = greatest(0, valor_atual - v_valor),
           aportado = greatest(0, aportado - v_valor)
     where id = v_investimento;
  end if;
end;
$$;
