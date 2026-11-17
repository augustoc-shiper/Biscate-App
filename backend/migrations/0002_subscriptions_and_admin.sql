-- FASE 3 - passo 2: tabela subscriptions, colunas aditivas e backfill.
-- Transacional e reexecutavel: todo o DDL usa IF NOT EXISTS / DO block e o
-- backfill usa ON CONFLICT DO NOTHING. Nao apaga nem sobrepoe dados.
-- So le de payments e professional_profiles; so escreve em subscriptions e
-- nas colunas aditivas de payments (applied_at/approved_at/subscription_id).

begin;

-- 1. Tipo de estado das subscricoes (CREATE TYPE nao tem IF NOT EXISTS).
do $$
begin
  create type public.subscription_status as enum (
    'pending_payment',
    'pending_activation',
    'active',
    'expired',
    'rejected',
    'pending_review'
  );
exception when duplicate_object then null;
end $$;

-- 2. Visibilidade separada da activacao real (so activePlan/assertActivePlan a leem).
alter table public.professional_profiles
  add column if not exists discoverable_until timestamptz;

-- 3. Colunas aditivas em payments (todas nullable ou com default, sem reescrever linhas).
alter table public.payments
  add column if not exists provider text not null default 'manual',
  add column if not exists method text not null default 'proof',
  add column if not exists currency char(3) not null default 'AOA',
  add column if not exists external_reference text,
  add column if not exists proof_url text,
  add column if not exists proof_sent_at timestamptz,
  add column if not exists approved_at timestamptz,
  add column if not exists rejected_at timestamptz,
  add column if not exists applied_at timestamptz,
  add column if not exists approved_by text references public.users(id) on delete set null,
  add column if not exists subscription_id text;

-- Referencia externa unica quando presente (gateways futuros).
create unique index if not exists payments_external_reference_key
  on public.payments (external_reference)
  where external_reference is not null;

-- 4. Tabela de subscricoes.
create table if not exists public.subscriptions (
  id text primary key default gen_random_uuid(),
  professional_id text not null references public.users(id) on delete cascade,
  plan_id integer references public.plans(id) on delete set null,
  payment_id text unique references public.payments(id) on delete set null,
  status public.subscription_status not null default 'pending_payment',
  approved_at timestamptz,
  activation_deadline timestamptz,
  activated_at timestamptz,
  expires_at timestamptz,
  needs_review boolean not null default false,
  review_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists subscriptions_professional_idx
  on public.subscriptions (professional_id, status);

create index if not exists subscriptions_pending_activation_idx
  on public.subscriptions (activation_deadline)
  where status = 'pending_activation';

create index if not exists subscriptions_active_expiry_idx
  on public.subscriptions (expires_at)
  where status = 'active';

-- FK circular adicionada depois de ambas as tabelas existirem (ADD CONSTRAINT
-- nao tem IF NOT EXISTS, logo verificamos o catalogo).
-- O nome segue a convencao do Drizzle (payments_subscription_id_subscriptions_id_fk)
-- para que `drizzle-kit push` nao crie uma segunda FK com o mesmo efeito.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'payments_subscription_id_subscriptions_id_fk'
      and conrelid = 'public.payments'::regclass
  ) then
    alter table public.payments
      add constraint payments_subscription_id_subscriptions_id_fk
      foreign key (subscription_id) references public.subscriptions(id)
      on delete set null;
  end if;
end $$;

-- 5. BACKFILL (nao inventa datas; preserva a expiracao real quando existe).

-- Caso 1: pagamento confirmed + expiracao real -> active/expired, ligado ao
-- pagamento confirmed mais recente do profissional.
insert into public.subscriptions
  (professional_id, plan_id, payment_id, status, approved_at, activated_at,
   expires_at, created_at, updated_at)
select
  pp.user_id,
  p.plan_id,
  p.id,
  (case when pp.plan_expires_at > now() then 'active' else 'expired' end)
    ::public.subscription_status,
  p.confirmed_at,
  p.confirmed_at,
  pp.plan_expires_at,
  now(),
  now()
from public.professional_profiles pp
join lateral (
  select pa.id, pa.plan_id, pa.confirmed_at
  from public.payments pa
  where pa.professional_id = pp.user_id
    and pa.status = 'confirmed'
  order by pa.confirmed_at desc nulls last, pa.created_at desc
  limit 1
) p on true
where pp.plan_expires_at is not null
on conflict (payment_id) do nothing;

-- Caso 3: pagamento confirmed SEM expiracao -> pending_review, datas nulas.
-- Um unico registo por profissional: o pagamento confirmed mais recente
-- (mesma regra do Caso 1), com guarda extra contra subscricao ja existente.
insert into public.subscriptions
  (professional_id, plan_id, payment_id, status, approved_at, needs_review,
   review_reason, created_at, updated_at)
select
  cp.professional_id,
  p.plan_id,
  p.id,
  'pending_review'::public.subscription_status,
  p.confirmed_at,
  true,
  'confirmed_without_expiry',
  now(),
  now()
from (
  select distinct pa.professional_id
  from public.payments pa
  where pa.status = 'confirmed'
) cp
join lateral (
  select pa.id, pa.plan_id, pa.confirmed_at
  from public.payments pa
  where pa.professional_id = cp.professional_id
    and pa.status = 'confirmed'
  order by pa.confirmed_at desc nulls last, pa.created_at desc
  limit 1
) p on true
where not exists (
  select 1 from public.professional_profiles pp
  where pp.user_id = cp.professional_id and pp.plan_expires_at is not null
)
  and not exists (
    select 1 from public.subscriptions s
    where s.professional_id = cp.professional_id
  )
on conflict (payment_id) do nothing;

-- Caso 4: perfil com expiracao SEM pagamento confirmed -> pending_review,
-- preservando a expiracao real. payment_id fica null (sem pagamento para ligar).
insert into public.subscriptions
  (professional_id, plan_id, payment_id, status, expires_at, needs_review,
   review_reason, created_at, updated_at)
select
  pp.user_id,
  null,
  null,
  'pending_review'::public.subscription_status,
  pp.plan_expires_at,
  true,
  'expiry_without_payment',
  now(),
  now()
from public.professional_profiles pp
where pp.plan_expires_at is not null
  and not exists (
    select 1 from public.payments pa
    where pa.professional_id = pp.user_id and pa.status = 'confirmed'
  )
  and not exists (
    select 1 from public.subscriptions s
    where s.professional_id = pp.user_id
  );

-- 6. Retro-link: o pagamento que originou a subscricao tambem aponta para ela.
update public.payments pa
set subscription_id = s.id
from public.subscriptions s
where s.payment_id = pa.id
  and pa.subscription_id is null;

-- 7. Marcar pagamentos confirmed legados como ja aplicados (idempotencia do
-- novo pipeline). Nao altera o status 'confirmed' para preservar historico.
update public.payments
set approved_at = coalesce(approved_at, confirmed_at),
    applied_at  = coalesce(applied_at, confirmed_at)
where status = 'confirmed'
  and applied_at is null;

commit;
