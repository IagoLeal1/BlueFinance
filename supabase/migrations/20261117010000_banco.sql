-- Open Finance pelo Meu Pluggy (design kit: TelaOpenFinance). O banco manda as transações uma vez por dia;
-- cada uma é conferida com o que já foi lançado.

-- A conexão de cada usuário: o item da Pluggy (o "código da conexão") e de quando em diante importa.
create table public.bancos (
  user_id uuid primary key references auth.users (id) on delete cascade,
  item_id text not null check (length(trim(item_id)) > 0),
  instituicao text not null default '',
  -- "Conta e cartão", "Conta" ou "Cartão".
  contas text not null default '',
  -- Daqui para frente: só importa transações deste dia em diante.
  desde date not null,
  -- Quando o banco atualizou na Pluggy, até quando vale a autorização e quando o app buscou.
  atualizado_em timestamptz,
  autorizacao_ate timestamptz,
  buscado_em timestamptz,
  -- Último problema ao buscar (ex.: a autorização venceu); null quando deu certo.
  erro text,
  criado_em timestamptz not null default now()
);
alter table public.bancos enable row level security;
create policy "bancos: dono lê" on public.bancos for select to authenticated using ((select auth.uid()) = user_id);
create policy "bancos: dono cria" on public.bancos for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "bancos: dono altera" on public.bancos for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "bancos: dono apaga" on public.bancos for delete to authenticated using ((select auth.uid()) = user_id);

-- Lançamento criado a partir do banco.
alter table public.lancamentos drop constraint lancamentos_origem_check;
alter table public.lancamentos add constraint lancamentos_origem_check check (origem in ('app', 'atalho', 'vr', 'acerto', 'banco'));

-- Cada transação que veio do banco e o que aconteceu com ela:
-- conferir (esperando você), conferido (bateu com um lançamento), lancado (virou lançamento), ignorado.
create table public.transacoes_banco (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  pluggy_id text not null,
  conta text not null check (conta in ('conta', 'cartao')),
  tipo text not null check (tipo in ('despesa', 'receita')),
  forma text not null check (forma in ('debito', 'pix', 'credito')),
  valor bigint not null check (valor > 0),
  parcelas smallint not null default 1 check (parcelas between 1 and 24),
  data timestamptz not null,
  descricao text not null,
  estabelecimento text not null,
  nome text not null default '',
  -- Nome da conta no banco (para achar o cartão do app).
  nome_da_conta text not null default '',
  categoria_pluggy text,
  categoria_id uuid references public.categorias (id) on delete set null,
  situacao text not null default 'conferir' check (situacao in ('conferir', 'conferido', 'lancado', 'ignorado')),
  lancamento_id uuid references public.lancamentos (id) on delete set null,
  criado_em timestamptz not null default now(),
  unique (user_id, pluggy_id)
);
create index transacoes_banco_conferir_idx on public.transacoes_banco (user_id, data desc) where situacao = 'conferir';
create index transacoes_banco_lancamento_idx on public.transacoes_banco (lancamento_id) where lancamento_id is not null;
create index transacoes_banco_categoria_idx on public.transacoes_banco (categoria_id) where categoria_id is not null;
alter table public.transacoes_banco enable row level security;
-- Quem grava é a busca diária (chave secreta); o dono lê e muda a situação (Lançar, Ignorar).
create policy "transacoes_banco: dono lê" on public.transacoes_banco for select to authenticated using ((select auth.uid()) = user_id);
create policy "transacoes_banco: dono altera" on public.transacoes_banco for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- Categoria aprendida: o mesmo estabelecimento entra sozinho na categoria (e com o "com o quê") da 1ª vez.
create table public.regras_banco (
  user_id uuid not null references auth.users (id) on delete cascade,
  tipo text not null check (tipo in ('despesa', 'receita')),
  estabelecimento text not null,
  categoria_id uuid not null references public.categorias (id) on delete cascade,
  descricao text not null,
  criado_em timestamptz not null default now(),
  primary key (user_id, tipo, estabelecimento)
);
create index regras_banco_categoria_idx on public.regras_banco (categoria_id);
alter table public.regras_banco enable row level security;
create policy "regras_banco: dono lê" on public.regras_banco for select to authenticated using ((select auth.uid()) = user_id);
create policy "regras_banco: dono cria" on public.regras_banco for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "regras_banco: dono altera" on public.regras_banco for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "regras_banco: dono apaga" on public.regras_banco for delete to authenticated using ((select auth.uid()) = user_id);
