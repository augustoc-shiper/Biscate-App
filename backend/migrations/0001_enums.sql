-- FASE 3 - passo 1: valores de enum.
-- Executar FORA de uma transaccao: o Postgres nao permite usar um valor de
-- enum recem-adicionado na mesma transaccao que o cria.
-- Idempotente: pode ser executado mais do que uma vez.

alter type public.user_role add value if not exists 'admin';
alter type public.payment_status add value if not exists 'proof_sent';
alter type public.payment_status add value if not exists 'approved';
alter type public.payment_status add value if not exists 'rejected';
