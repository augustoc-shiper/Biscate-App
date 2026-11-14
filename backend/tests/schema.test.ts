import { execSync } from 'node:child_process';
import { afterAll, beforeAll, expect, it } from 'vitest';
import { Pool } from 'pg';

const testUrl =
  process.env.DATABASE_URL_TEST ??
  'postgres:///biscate_test?host=/run/postgresql';

const pool = new Pool({ connectionString: testUrl });

beforeAll(() => {
  execSync('npx drizzle-kit push --force', {
    env: { ...process.env, DATABASE_URL: testUrl },
    stdio: 'pipe',
    timeout: 60000,
  });
});

afterAll(async () => {
  await pool.end();
});

it('cria as 14 tabelas do spec', async () => {
  const res = await pool.query(
    `select table_name from information_schema.tables
     where table_schema = 'public' and table_type = 'BASE TABLE'
     order by table_name`,
  );
  const names = res.rows.map((r) => r.table_name);
  expect(names).toHaveLength(14);
  expect(names).toEqual(
    expect.arrayContaining([
      'users',
      'professional_profiles',
      'categories',
      'bairro',
      'work_photos',
      'favorites',
      'requests',
      'offers',
      'conversations',
      'messages',
      'reviews',
      'plans',
      'payments',
      'notifications',
    ]),
  );
});

it('usa gen_random_uuid como default do id de users', async () => {
  const res = await pool.query(
    `insert into users (name, email, password_hash)
     values ('Schema Test', 'schema@test.local', 'x')
     returning id`,
  );
  expect(String(res.rows[0].id)).toMatch(
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
  );
});

it('professional_profiles tem price_min e distance_km', async () => {
  const res = await pool.query(
    `select column_name from information_schema.columns
     where table_name = 'professional_profiles'`,
  );
  const cols = res.rows.map((r) => r.column_name);
  expect(cols).toContain('price_min');
  expect(cols).toContain('distance_km');
});
