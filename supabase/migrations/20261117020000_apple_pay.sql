-- Apple Pay pela automação "Carteira" do app Atalhos (design kit: TelaApplePay).

-- Gasto que veio do Apple Pay. Lugar novo entra "a confirmar" (já conta no mês e aparece em Para conferir);
-- estabelecimento é a chave do lugar, para aprender a categoria e o nome ao confirmar.
alter table public.lancamentos drop constraint lancamentos_origem_check;
alter table public.lancamentos add constraint lancamentos_origem_check
  check (origem in ('app', 'atalho', 'vr', 'acerto', 'banco', 'applepay'));
alter table public.lancamentos
  add column a_confirmar boolean not null default false,
  add column estabelecimento text;
create index lancamentos_a_confirmar_idx on public.lancamentos (user_id, data desc) where a_confirmar;

-- Cartões da Carteira do iPhone e como cada um entra: débito, crédito (num cartão do app) ou VR.
-- Cada cartão aparece aqui no primeiro pagamento, com a forma adivinhada pelo nome.
create table public.cartoes_carteira (
  user_id uuid not null references auth.users (id) on delete cascade,
  nome text not null check (length(trim(nome)) > 0),
  forma text not null check (forma in ('debito', 'credito', 'vr')),
  cartao_id uuid references public.cartoes (id) on delete set null,
  criado_em timestamptz not null default now(),
  primary key (user_id, nome)
);
create index cartoes_carteira_cartao_idx on public.cartoes_carteira (cartao_id) where cartao_id is not null;
alter table public.cartoes_carteira enable row level security;
create policy "cartoes_carteira: dono lê" on public.cartoes_carteira for select to authenticated using ((select auth.uid()) = user_id);
create policy "cartoes_carteira: dono cria" on public.cartoes_carteira for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "cartoes_carteira: dono altera" on public.cartoes_carteira for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "cartoes_carteira: dono apaga" on public.cartoes_carteira for delete to authenticated using ((select auth.uid()) = user_id);
