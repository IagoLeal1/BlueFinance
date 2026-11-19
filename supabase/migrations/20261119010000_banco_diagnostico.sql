-- Open Finance: o que a Pluggy mandou na última busca, por conta (só contagens e datas, sem descrições nem valores).
-- Serve para saber se o banco ainda não mandou nada ou se o app está deixando transações de fora.
alter table public.bancos add column ultima_busca jsonb;
