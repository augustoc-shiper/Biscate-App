import { execSync } from 'node:child_process';

export default function globalSetup(): void {
  execSync('npx drizzle-kit push --force', {
    env: {
      ...process.env,
      DATABASE_URL:
        process.env.DATABASE_URL_TEST ??
        'postgres:///biscate_test?host=/run/postgresql',
    },
    stdio: 'pipe',
    timeout: 60000,
  });
}
