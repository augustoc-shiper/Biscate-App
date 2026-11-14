import { execSync } from 'node:child_process';
import pg from 'pg';

const testDatabaseUrl =
  process.env.DATABASE_URL_TEST ?? 'postgres:///biscate_test?host=/run/postgresql';

export default async function globalSetup(): Promise<void> {
  execSync('npx drizzle-kit push --force', {
    env: {
      ...process.env,
      DATABASE_URL: testDatabaseUrl,
    },
    stdio: 'pipe',
    timeout: 60000,
  });

  const client = new pg.Client({ connectionString: testDatabaseUrl });
  await client.connect();
  try {
    await client.query(
      `truncate table
         users, categories, bairro, professional_profiles, work_photos,
         favorites, requests, offers, conversations, messages, reviews,
         plans, payments, notifications
       restart identity cascade`,
    );
  } finally {
    await client.end();
  }
}
