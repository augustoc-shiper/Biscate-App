import request from 'supertest';
import { beforeAll, expect, it } from 'vitest';
import { Pool } from 'pg';
import { createApp } from '../src/app.js';
import { seed } from '../src/db/seed.js';

const app = createApp();
const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL_TEST ??
    'postgres:///biscate_test?host=/run/postgresql',
});

let clientToken = '';
let otherClientToken = '';
let proToken = '';
let requestId = '';
let offerId = '';
const ts = Date.now();

beforeAll(async () => {
  await seed();
  const client = await request(app).post('/api/auth/register').send({
    name: 'Cliente Pedidos',
    email: `pedidos-${ts}@test.ao`,
    password: 'senha123',
    role: 'client',
  });
  clientToken = client.body.data.token;

  const other = await request(app).post('/api/auth/register').send({
    name: 'Outro Cliente',
    email: `outro-${ts}@test.ao`,
    password: 'senha123',
    role: 'client',
  });
  otherClientToken = other.body.data.token;

  const noPlan = await request(app).post('/api/auth/register').send({
    name: 'Pro Sem Plano',
    email: `prosemplano-${ts}@test.ao`,
    password: 'senha123',
    role: 'professional',
  });
  proToken = noPlan.body.data.token;
});

it('cliente cria pedido e recebe 201', async () => {
  const res = await request(app)
    .post('/api/requests')
    .set('Authorization', `Bearer ${clientToken}`)
    .send({
      categoryId: 1,
      description: 'Preciso de trocar a canalização da cozinha com urgência.',
      bairroId: 2,
      when: 'today',
    });
  expect(res.status).toBe(201);
  expect(res.body.data.status).toBe('open');
  expect(res.body.data.when).toBe('today');
  requestId = res.body.data.id;
});

it('pedido com dados inválidos devolve 400 VALIDATION_ERROR', async () => {
  const res = await request(app)
    .post('/api/requests')
    .set('Authorization', `Bearer ${clientToken}`)
    .send({ categoryId: 1, description: 'curto', bairroId: 2, when: 'amanha' });
  expect(res.status).toBe(400);
  expect(res.body.error.code).toBe('VALIDATION_ERROR');
});

it('GET /requests devolve só os pedidos do próprio', async () => {
  const res = await request(app)
    .get('/api/requests')
    .set('Authorization', `Bearer ${clientToken}`);
  expect(res.status).toBe(200);
  expect(res.body.data).toHaveLength(1);
  expect(res.body.data[0].id).toBe(requestId);
});

it('profissional sem plano devolve 403 NO_ACTIVE_PLAN', async () => {
  const res = await request(app)
    .post(`/api/requests/${requestId}/offers`)
    .set('Authorization', `Bearer ${proToken}`)
    .send({ price: 12000, message: 'Faço isso por esse valor.' });
  expect(res.status).toBe(403);
  expect(res.body.error.code).toBe('NO_ACTIVE_PLAN');
});

it('profissional com plano envia proposta e recebe 201', async () => {
  const login = await request(app)
    .post('/api/auth/login')
    .send({ email: 'profissional@biscate.ao', password: 'biscate123' });
  proToken = login.body.data.token;
  const res = await request(app)
    .post(`/api/requests/${requestId}/offers`)
    .set('Authorization', `Bearer ${proToken}`)
    .send({ price: 15000, message: 'Passo amanhã de manhã.' });
  expect(res.status).toBe(201);
  expect(res.body.data.status).toBe('sent');
  expect(res.body.data.price).toBe(15000);
  offerId = res.body.data.id;
});

it('cliente que não é dono não pode aceitar (403)', async () => {
  const res = await request(app)
    .post(`/api/offers/${offerId}/accept`)
    .set('Authorization', `Bearer ${otherClientToken}`);
  expect(res.status).toBe(403);
  expect(res.body.error.code).toBe('FORBIDDEN');
});

it('dono aceita: offer accepted, pedido in_conversation e conversa criada', async () => {
  const res = await request(app)
    .post(`/api/offers/${offerId}/accept`)
    .set('Authorization', `Bearer ${clientToken}`);
  expect(res.status).toBe(200);
  expect(res.body.data.status).toBe('accepted');

  const list = await request(app)
    .get('/api/requests')
    .set('Authorization', `Bearer ${clientToken}`);
  expect(list.body.data[0].status).toBe('in_conversation');
  expect(list.body.data[0].offers).toHaveLength(1);

  const conv = await pool.query(
    `select id from conversations
     where client_id = (select id from users where email = $1)
       and professional_id = (select id from users where email = 'profissional@biscate.ao')`,
    [`pedidos-${ts}@test.ao`],
  );
  expect(conv.rows).toHaveLength(1);
});

it('recusar proposta devolve status declined', async () => {
  const offer2 = await request(app)
    .post(`/api/requests/${requestId}/offers`)
    .set('Authorization', `Bearer ${proToken}`)
    .send({ price: 20000, message: 'Alternativa mais completa.' });
  const res = await request(app)
    .post(`/api/offers/${offer2.body.data.id}/decline`)
    .set('Authorization', `Bearer ${clientToken}`);
  expect(res.status).toBe(200);
  expect(res.body.data.status).toBe('declined');
});

it('request inexistente devolve 404', async () => {
  const res = await request(app)
    .post('/api/requests/nao-existe/offers')
    .set('Authorization', `Bearer ${proToken}`)
    .send({ price: 1000, message: 'x'.repeat(20) });
  expect(res.status).toBe(404);
  expect(res.body.error.code).toBe('NOT_FOUND');
});
