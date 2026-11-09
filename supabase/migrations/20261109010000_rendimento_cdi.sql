-- Rendimento automático pelo CDI (design kit: TelaInvestimentoCdi).
-- percentual_cdi preenchido = o app calcula o valor (101,5 = 101,5% do CDI); vazio = "Não calcular" (valor_atual à mão).
alter table public.investimentos
  add column percentual_cdi numeric(6, 2) check (percentual_cdi is null or (percentual_cdi > 0 and percentual_cdi <= 1000)),
  add column aplicado_em date,
  add column isento_ir boolean not null default false;

-- "Ajustar valor": a diferença para o valor do banco, no dia. É rendimento e rende junto dali em diante.
create table public.ajustes_investimento (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  investimento_id uuid not null references public.investimentos (id) on delete cascade,
  dia date not null,
  valor bigint not null,
  criado_em timestamptz not null default now()
);

create index ajustes_investimento_investimento_idx on public.ajustes_investimento (investimento_id);
create index ajustes_investimento_user_idx on public.ajustes_investimento (user_id);

alter table public.ajustes_investimento enable row level security;

create policy "ajustes_investimento: dono lê" on public.ajustes_investimento for select to authenticated using ((select auth.uid()) = user_id);
create policy "ajustes_investimento: dono cria" on public.ajustes_investimento for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "ajustes_investimento: dono apaga" on public.ajustes_investimento for delete to authenticated using ((select auth.uid()) = user_id);

-- CDI de cada dia útil, em % ao dia, como o Banco Central publica (SGS 12). Dado público: todos leem, só o servidor grava.
create table public.taxas_cdi (
  dia date primary key,
  taxa numeric(12, 8) not null check (taxa >= 0)
);

alter table public.taxas_cdi enable row level security;

create policy "taxas_cdi: quem entrou lê" on public.taxas_cdi for select to authenticated using (true);

-- Até onde o servidor já buscou o CDI no Banco Central (uma linha só). Sem política: só o servidor lê e grava.
create table public.cdi_sincronizacao (
  id boolean primary key default true check (id),
  desde date not null,
  verificado_em timestamptz not null
);

alter table public.cdi_sincronizacao enable row level security;
