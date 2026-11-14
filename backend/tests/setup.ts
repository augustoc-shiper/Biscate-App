process.env.DATABASE_URL =
  process.env.DATABASE_URL_TEST ??
  'postgres:///biscate_test?host=/run/postgresql';
process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'test-secret';
