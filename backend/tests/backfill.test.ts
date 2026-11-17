import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, expect, it } from 'vitest';
import { Client } from 'pg';

const testUrl =
  process.env.DATABASE_URL_TEST ??
  'postgres:///biscate_test?host=/run/postgresql';

// Guarda: apenas a BD de teste pode ser afectada.
if (!/biscate_test($|\?)/.test(testUrl)) {
  throw new Error('GUARDA: BD nao e de teste');
}

// Executa o backfill REAL da migração, sem copiar a lógica para o teste.
const migrationPath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../migrations/0002_subscriptions_and_admin.sql',
);
const migration = readFileSync(migrationPath, 'utf8');
const backfill =
  '--' + migration.split('-- 5. BACKFILL')[1].split('-- 6. Retro-link')[0];

let client: Client;

beforeAll(async () => {
  client = new Client({ connectionString: testUrl });
  await client.connect();
  // Tudo o que este ficheiro fizer é desfeito no fim.
  await client.query('begin');

  // Dados mínimos e auto-contidos (não dependem de seed.ts nem de outros ficheiros).
  await client.query(`
    insert into plans (id, days, price_kz, name)
    values (1, 3, 500, '3 dias')
    on conflict (id) do nothing
  `);
  await client.query(`
    insert into users (id, name, email, password_hash, role)
    values ('bf-multi-pro', 'Multi Pro', 'bf-multi-pro@test.local', 'x', 'professional')
  `);
  await client.query(`
    insert into payments
      (id, professional_id, plan_id, entity, reference, amount_kz, status, confirmed_at)
    values
      ('bf-multi-p1', 'bf-multi-pro', 1, 'E', 'R1', 500, 'confirmed', now() - interval '5 days'),
      ('bf-multi-p2', 'bf-multi-pro', 1, 'E', 'R2', 500, 'confirmed', now() - interval '1 day')
  `);
  // Perfil sem plan_expires_at (default null) => caso 3.
  await client.query(`insert into professional_profiles (user_id) values ('bf-multi-pro')`);
});

afterAll(async () => {
  await client.query('rollback');
  await client.end();
});

it('cria uma única subscrição pending_review para profissional com vários pagamentos confirmed sem expiração', async () => {
  await client.query(backfill);

  const res = await client.query(
    `select status::text as status, payment_id, needs_review, review_reason,
            (expires_at is null) as sem_expiracao
     from subscriptions where professional_id = 'bf-multi-pro'`,
  );

  expect(res.rows).toHaveLength(1);
  expect(res.rows[0]).toMatchObject({
    status: 'pending_review',
    payment_id: 'bf-multi-p2', // pagamento confirmed mais recente
    needs_review: true,
    review_reason: 'confirmed_without_expiry',
    sem_expiracao: true,
  });

  // Os pagamentos originais ficam intactos.
  const payments = await client.query(
    `select id, status::text as status from payments
     where professional_id = 'bf-multi-pro' order by id`,
  );
  expect(payments.rows).toHaveLength(2);
  expect(payments.rows.every((p) => p.status === 'confirmed')).toBe(true);
});

it('reexecutar o backfill não cria duplicações', async () => {
  await client.query(backfill);
  await client.query(backfill);

  const res = await client.query(
    `select count(*)::int as n from subscriptions where professional_id = 'bf-multi-pro'`,
  );
  expect(res.rows[0].n).toBe(1);
});
