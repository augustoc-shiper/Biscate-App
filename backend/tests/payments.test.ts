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

const png = Buffer.from('89504e470d0a1a0a0000000d49484452', 'hex');

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
  // não contaminar outros ficheiros (contagem de planos activos)
  await pool.query(
    'delete from subscriptions where professional_id = $1 or professional_id = $2',
    [proAId, proBId],
  );
  await pool.query(
    'delete from payments where professional_id = $1 or professional_id = $2',
    [proAId, proBId],
  );
  await pool.query(
    `update professional_profiles
        set plan_expires_at = null, discoverable_until = null
      where user_id = $1 or user_id = $2`,
    [proAId, proBId],
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

  const other = await request(app)
    .post('/api/payments')
    .set('Authorization', `Bearer ${proBToken}`)
    .send({ planId: 1 });
  expect(other.status).toBe(201);
  expect(other.body.data.reference).not.toBe(res.body.data.reference);
});

it('compra enquanto existe pagamento pendente é bloqueada (409)', async () => {
  const res = await request(app)
    .post('/api/payments')
    .set('Authorization', `Bearer ${proAToken}`)
    .send({ planId: 1 });
  expect(res.status).toBe(409);
  expect(res.body.error.code).toBe('PAYMENT_IN_PROGRESS');
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
  expect(res.body.data.length).toBeGreaterThanOrEqual(1);
  for (const payment of res.body.data) {
    expect(payment.professionalId).toBe(proAId);
  }
});

it('POST /:id/proof aceita imagem com bytes mágicos válidos', async () => {
  const res = await request(app)
    .post(`/api/payments/${paymentId}/proof`)
    .set('Authorization', `Bearer ${proAToken}`)
    .attach('proof', png, { filename: 'comprovativo.png', contentType: 'image/png' });
  expect(res.status).toBe(200);
  expect(res.body.data.status).toBe('proof_sent');
  expect(res.body.data.proofUrl).toMatch(/^\/uploads\/.+\.png$/);
});

it('POST /:id/proof rejeita PDF e conteúdo que não é imagem', async () => {
  const pdf = Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\n%%EOF');
  const res = await request(app)
    .post(`/api/payments/${paymentId}/proof`)
    .set('Authorization', `Bearer ${proAToken}`)
    .attach('proof', pdf, { filename: 'comprovativo.pdf', contentType: 'application/pdf' });
  expect(res.status).toBe(400);
  expect(res.body.error.code).toBe('INVALID_FILE_TYPE');

  const fake = Buffer.from('isto não é uma imagem duh');
  const res2 = await request(app)
    .post(`/api/payments/${paymentId}/proof`)
    .set('Authorization', `Bearer ${proAToken}`)
    .attach('proof', fake, { filename: 'x.png', contentType: 'image/png' });
  expect(res2.status).toBe(400);
});

it('POST /:id/proof de pagamento alheio devolve 403', async () => {
  const res = await request(app)
    .post(`/api/payments/${paymentId}/proof`)
    .set('Authorization', `Bearer ${proBToken}`)
    .attach('proof', png, { filename: 'x.png', contentType: 'image/png' });
  expect(res.status).toBe(403);
});

it('POST /:id/confirm público foi removido (404)', async () => {
  const res = await request(app)
    .post(`/api/payments/${paymentId}/confirm`)
    .set('Authorization', `Bearer ${proAToken}`);
  expect(res.status).toBe(404);
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
