-- Tokens pessoais que o Atalho do iOS usa para lançar sem abrir o app.
-- Só o hash (sha256) é guardado; o token em texto aparece uma única vez, na criação.
create table public.tokens_pessoais (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  hash text not null unique,
  criado_em timestamptz not null default now(),
  usado_em timestamptz
);

create index tokens_pessoais_user_id_idx on public.tokens_pessoais (user_id);

-- Sem políticas: ninguém lê ou escreve pelo cliente. Só o servidor (chave secreta) acessa.
alter table public.tokens_pessoais enable row level security;
