-- Aparelhos que recebem o aviso da fatura (Web Push). Cada iPhone/navegador tem um endpoint próprio.
create table public.inscricoes_push (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  criado_em timestamptz not null default now()
);
create index inscricoes_push_user_idx on public.inscricoes_push (user_id);
alter table public.inscricoes_push enable row level security;
create policy "inscricoes_push: dono lê" on public.inscricoes_push for select to authenticated using ((select auth.uid()) = user_id);
create policy "inscricoes_push: dono cria" on public.inscricoes_push for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "inscricoes_push: dono apaga" on public.inscricoes_push for delete to authenticated using ((select auth.uid()) = user_id);
