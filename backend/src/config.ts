export const config = {
  port: Number(process.env.PORT ?? 3001),
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
  jwtSecret: process.env.JWT_SECRET ?? 'biscate-dev-secret',
  databaseUrl:
    process.env.DATABASE_URL ??
    process.env.DATABASE_URL_TEST ??
    'postgres:///biscate?host=/run/postgresql',
  jwtExpiresIn: '7d',
} as const;
