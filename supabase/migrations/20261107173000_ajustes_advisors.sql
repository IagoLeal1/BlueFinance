-- Ajustes apontados pelos advisors do Supabase.

-- A função das categorias padrão só deve rodar pelo gatilho do cadastro, nunca via /rest/v1/rpc.
revoke execute on function public.criar_categorias_padrao() from public, anon, authenticated;

-- Índices para as chaves estrangeiras de lançamentos.
create index lancamentos_categoria_id_idx on public.lancamentos (categoria_id);
create index lancamentos_investimento_id_idx on public.lancamentos (investimento_id);

-- tokens_pessoais continua sem políticas de propósito: só o servidor (chave secreta) acessa.
