import { execSync } from 'node:child_process';
import { afterAll, beforeAll, expect, it } from 'vitest';
import { Pool } from 'pg';
import { seed } from '../src/db/seed.js';

const testUrl =
  process.env.DATABASE_URL_TEST ??
  'postgres:///biscate_test?host=/run/postgresql';

const pool = new Pool({ connectionString: testUrl });

beforeAll(async () => {
  execSync('npx drizzle-kit push --force', {
    env: { ...process.env, DATABASE_URL: testUrl },
    stdio: 'pipe',
    timeout: 60000,
  });
  await pool.query(
    'truncate users, categories, bairro, plans restart identity cascade',
  );
  await seed();
});

afterAll(async () => {
  await pool.end();
});

const count = async (table: string): Promise<number> => {
  const res = await pool.query(`select count(*)::int as n from ${table}`);
  return res.rows[0].n as number;
};

it('cria 8 categorias, 6 bairros e 4 planos', async () => {
  expect(await count('categories')).toBe(8);
  expect(await count('bairro')).toBe(6);
  expect(await count('plans')).toBe(4);
});

it('cria 6 profissionais com plano activo e nota do protótipo', async () => {
  expect(await count('professional_profiles')).toBe(6);
  const res = await pool.query(
    `select u.name, p.rating_avg, p.plan_expires_at
     from professional_profiles p join users u on u.id = p.user_id
     where u.name = 'Manuel Kiala'`,
  );
  expect(res.rows).toHaveLength(1);
  expect(Number(res.rows[0].rating_avg)).toBeCloseTo(4.8, 1);
  expect(new Date(res.rows[0].plan_expires_at).getTime()).toBeGreaterThan(
    Date.now(),
  );
});

it('cria 9 utilizadores incluindo os de login', async () => {
  expect(await count('users')).toBe(9);
  const res = await pool.query(
    `select u.role, p.plan_expires_at from users u
     left join professional_profiles p on p.user_id = u.id
     where u.email in ('cliente@biscate.ao', 'profissional@biscate.ao')
     order by u.email`,
  );
  expect(res.rows).toHaveLength(2);
  expect(res.rows[0].role).toBe('client');
  expect(res.rows[1].role).toBe('professional');
  expect(new Date(res.rows[1].plan_expires_at).getTime()).toBeGreaterThan(
    Date.now(),
  );
});

it('cria pedido com propostas, conversa, favoritos, notificação e pagamento confirmado', async () => {
  expect(await count('requests')).toBe(1);
  expect(await count('offers')).toBe(2);
  expect(await count('conversations')).toBeGreaterThanOrEqual(2);
  expect(await count('messages')).toBeGreaterThanOrEqual(3);
  expect(await count('favorites')).toBeGreaterThanOrEqual(1);
  expect(await count('notifications')).toBeGreaterThanOrEqual(1);
  expect(await count('payments')).toBeGreaterThanOrEqual(1);
  const res = await pool.query(
    `select count(*)::int as n from payments where status = 'confirmed'`,
  );
  expect(res.rows[0].n).toBeGreaterThanOrEqual(1);
});

it('é idempotente: correr duas vezes não duplica users', async () => {
  const before = await count('users');
  await seed();
  expect(await count('users')).toBe(before);
});
