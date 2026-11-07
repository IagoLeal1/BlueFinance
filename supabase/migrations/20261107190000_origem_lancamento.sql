-- De onde veio o lançamento: do app ou do Atalho do iOS (mostrado como "pelo Atalho" na lista).
alter table public.lancamentos
  add column origem text not null default 'app' check (origem in ('app', 'atalho'));
