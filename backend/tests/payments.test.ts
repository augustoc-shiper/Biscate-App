import request from 'supertest';
import { afterAll, beforeAll, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { pool } from '../src/db/client.js';
import { seed } from '../src/db/seed.js';

const app = createApp();

let proAToken = '';
let proAId = '';
let proBToken = '';
let proBId = '';
let clientToken = '';
let paymentId = '';
const ts = Date.now();

beforeAll(async () => {
  await seed();

  const proA = await request(app).post('/api/auth/register').send({
    name: 'Prof Pagamentos A',
    email: `pay-a-${ts}@test.ao`,
    password: 'senha123',
    role: 'professional',
  });
  proAToken = proA.body.data.token;
  proAId = proA.body.data.user.id;

  const proB = await request(app).post('/api/auth/register').send({
    name: 'Prof Pagamentos B',
    email: `pay-b-${ts}@test.ao`,
    password: 'senha123',
    role: 'professional',
  });
  proBToken = proB.body.data.token;
  proBId = proB.body.data.user.id;

  const client = await request(app).post('/api/auth/register').send({
    name: 'Cliente Pagamentos',
    email: `pay-c-${ts}@test.ao`,
    password: 'senha123',
    role: 'client',
  });
  clientToken = client.body.data.token;
});

afterAll(async () => {
  // não contaminar professionals.test (contagem de planos activos)
  await pool.query(
    'delete from payments where professional_id = $1 or professional_id = $2',
    [proAId, proBId],
  );
  await pool.query(
    'update professional_profiles set plan_expires_at = null where user_id = $1',
    [proAId],
  );
});

it('GET /api/plans público devolve 4 planos', async () => {
  const res = await request(app).get('/api/plans');
  expect(res.status).toBe(200);
  expect(res.body.data).toHaveLength(4);
  expect(res.body.data[0]).toHaveProperty('priceKz');
  expect(res.body.data[0]).toHaveProperty('days');
});

it('POST /api/payments cria pagamento pendente com entity e reference únicos', async () => {
  const res = await request(app)
    .post('/api/payments')
    .set('Authorization', `Bearer ${proAToken}`)
    .send({ planId: 3 });
  expect(res.status).toBe(201);
  expect(res.body.data.entity).toBe('90210');
  expect(res.body.data.status).toBe('pending');
  expect(res.body.data.amountKz).toBe(3000);
  const digits = String(res.body.data.reference).replace(/\D/g, '');
  expect(digits).toHaveLength(9);
  paymentId = res.body.data.id;

  const second = await request(app)
    .post('/api/payments')
    .set('Authorization', `Bearer ${proAToken}`)
    .send({ planId: 1 });
  expect(second.status).toBe(201);
  expect(second.body.data.reference).not.toBe(res.body.data.reference);
});

it('cliente não pode criar pagamento (403)', async () => {
  const res = await request(app)
    .post('/api/payments')
    .set('Authorization', `Bearer ${clientToken}`)
    .send({ planId: 1 });
  expect(res.status).toBe(403);
});

it('GET /api/payments devolve o histórico do próprio', async () => {
  const res = await request(app)
    .get('/api/payments')
    .set('Authorization', `Bearer ${proAToken}`);
  expect(res.status).toBe(200);
  expect(res.body.data.length).toBeGreaterThanOrEqual(2);
  for (const payment of res.body.data) {
    expect(payment.professionalId).toBe(proAId);
  }
});

it('confirm activa o plano: plan_expires_at ≈ agora + dias', async () => {
  const res = await request(app)
    .post(`/api/payments/${paymentId}/confirm`)
    .set('Authorization', `Bearer ${proAToken}`);
  expect(res.status).toBe(200);
  expect(res.body.data.status).toBe('confirmed');

  const { rows } = await pool.query(
    'select plan_expires_at from professional_profiles where user_id = $1',
    [proAId],
  );
  const expires = new Date(rows[0].plan_expires_at).getTime();
  const expected = Date.now() + 30 * 24 * 60 * 60 * 1000;
  expect(Math.abs(expires - expected)).toBeLessThan(5 * 60 * 1000);
});

it('segunda confirm é idempotente (não soma dias)', async () => {
  const { rows: before } = await pool.query(
    'select plan_expires_at from professional_profiles where user_id = $1',
    [proAId],
  );
  const res = await request(app)
    .post(`/api/payments/${paymentId}/confirm`)
    .set('Authorization', `Bearer ${proAToken}`);
  expect(res.status).toBe(200);
  expect(res.body.data.status).toBe('confirmed');

  const { rows: after } = await pool.query(
    'select plan_expires_at from professional_profiles where user_id = $1',
    [proAId],
  );
  expect(new Date(after[0].plan_expires_at).getTime()).toBe(
    new Date(before[0].plan_expires_at).getTime(),
  );
});

it('confirm de payment alheio devolve 403', async () => {
  const res = await request(app)
    .post(`/api/payments/${paymentId}/confirm`)
    .set('Authorization', `Bearer ${proBToken}`);
  expect(res.status).toBe(403);
  expect(res.body.error.code).toBe('FORBIDDEN');
});

it('planId inexistente devolve 404', async () => {
  const res = await request(app)
    .post('/api/payments')
    .set('Authorization', `Bearer ${proAToken}`)
    .send({ planId: 999 });
  expect(res.status).toBe(404);
});

it('sem token devolve 401', async () => {
  const res = await request(app).post('/api/payments').send({ planId: 1 });
  expect(res.status).toBe(401);
});
