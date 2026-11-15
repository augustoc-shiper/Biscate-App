import request from 'supertest';
import { beforeAll, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { pool } from '../src/db/client.js';
import { seed } from '../src/db/seed.js';

const app = createApp();

let proToken = '';
let proId = '';
let clientToken = '';
let requestId = '';
const ts = Date.now();

beforeAll(async () => {
  await seed();

  const pro = await request(app).post('/api/auth/register').send({
    name: 'Prof Dashboard',
    email: `dash-p-${ts}@test.ao`,
    password: 'senha123',
    role: 'professional',
  });
  proToken = pro.body.data.token;
  proId = pro.body.data.user.id;
  await pool.query(
    "update professional_profiles set plan_expires_at = now() + interval '30 days' where user_id = $1",
    [proId],
  );

  const client = await request(app).post('/api/auth/register').send({
    name: 'Cliente Dashboard',
    email: `dash-c-${ts}@test.ao`,
    password: 'senha123',
    role: 'client',
  });
  clientToken = client.body.data.token;

  const cats = await request(app).get('/api/categories');
  const bairros = await request(app).get('/api/bairro');
  const req = await request(app)
    .post('/api/requests')
    .set('Authorization', `Bearer ${clientToken}`)
    .send({
      categoryId: cats.body.data[0].id,
      bairroId: bairros.body.data[0].id,
      description: 'Preciso de ajuda com um trabalho no dashboard',
      when: 'week',
    });
  requestId = req.body.data.id;
});

it('dashboard 200 devolve visitas, plan e pendingOffers vazio', async () => {
  const res = await request(app)
    .get('/api/dashboard')
    .set('Authorization', `Bearer ${proToken}`);
  expect(res.status).toBe(200);
  const data = res.body.data;
  expect(typeof data.visitas).toBe('number');
  expect(typeof data.contactos).toBe('number');
  expect(typeof data.ratingAvg).toBe('number');
  expect(data.plan.active).toBe(true);
  expect(typeof data.plan.daysLeft).toBe('number');
  expect(data.plan.daysLeft).toBeGreaterThan(25);
  expect(Array.isArray(data.pendingOffers)).toBe(true);
  expect(data.pendingOffers).toHaveLength(0);
});

it('oferta pendente aparece no dashboard e contactos conta conversas', async () => {
  const offer = await request(app)
    .post(`/api/requests/${requestId}/offers`)
    .set('Authorization', `Bearer ${proToken}`)
    .send({ price: 7500, message: 'Faço isso por 7500 Kz' });
  expect(offer.status).toBe(201);

  const conv = await request(app)
    .post('/api/conversations')
    .set('Authorization', `Bearer ${clientToken}`)
    .send({ professionalId: proId });
  expect(conv.status).toBe(201);

  const res = await request(app)
    .get('/api/dashboard')
    .set('Authorization', `Bearer ${proToken}`);
  expect(res.status).toBe(200);
  expect(res.body.data.pendingOffers).toHaveLength(1);
  expect(res.body.data.pendingOffers[0].price).toBe(7500);
  expect(res.body.data.pendingOffers[0].request).toBeTruthy();
  expect(res.body.data.contactos).toBe(1);
});

it('cliente recebe 403 no dashboard', async () => {
  const res = await request(app)
    .get('/api/dashboard')
    .set('Authorization', `Bearer ${clientToken}`);
  expect(res.status).toBe(403);
  expect(res.body.error.code).toBe('FORBIDDEN');
});

it('sem token devolve 401', async () => {
  const res = await request(app).get('/api/dashboard');
  expect(res.status).toBe(401);
});
