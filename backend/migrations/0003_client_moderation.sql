-- FASE 4: sinais de moderação do cliente, usados pela activação por mensagem.
-- Aditivo e reexecutavel: colunas com default, sem reescrever linhas existentes.

begin;

alter table public.users
  add column if not exists blocked boolean not null default false,
  add column if not exists suspended boolean not null default false;

commit;
