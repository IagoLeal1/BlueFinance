-- VR (vale-refeição): um segundo saldo, separado da conta (design kit: TelaVr).
-- Guarda quanto cai por mês e em que dia. O depósito de cada mês, o saldo inicial e os acertos são
-- lançamentos pagos com VR (forma_pagamento 'vr'); o saldo do VR é a soma deles.
create table public.vr (
  user_id uuid primary key references auth.users (id) on delete cascade,
  valor_mensal bigint not null check (valor_mensal > 0),
  dia smallint not null check (dia between 1 and 31),
  -- Os depósitos automáticos contam a partir do dia seguinte a este: o saldo informado já inclui os anteriores.
  desde timestamptz not null default now(),
  criado_em timestamptz not null default now()
);
alter table public.vr enable row level security;
create policy "vr: dono lê" on public.vr for select to authenticated using ((select auth.uid()) = user_id);
create policy "vr: dono cria" on public.vr for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "vr: dono altera" on public.vr for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "vr: dono apaga" on public.vr for delete to authenticated using ((select auth.uid()) = user_id);

-- Pagar com VR. Origem 'vr': o depósito do mês, lançado sozinho; 'acerto': o saldo inicial ou uma correção.
alter table public.lancamentos drop constraint lancamentos_forma_pagamento_check;
alter table public.lancamentos
  add constraint lancamentos_forma_pagamento_check check (forma_pagamento in ('debito', 'pix', 'credito', 'vr'));
alter table public.lancamentos drop constraint lancamentos_origem_check;
alter table public.lancamentos
  add constraint lancamentos_origem_check check (origem in ('app', 'atalho', 'vr', 'acerto'));

-- Um depósito do VR por mês: completar os depósitos de novo (ou duas telas ao mesmo tempo) não duplica.
create unique index lancamentos_deposito_vr_idx on public.lancamentos (user_id, competencia) where origem = 'vr';
create index lancamentos_vr_idx on public.lancamentos (user_id) where forma_pagamento = 'vr';
