import request from 'supertest';
import { beforeAll, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { pool } from '../src/db/client.js';
import { seed } from '../src/db/seed.js';

const app = createApp();

let clientToken = '';
let proToken = '';
let attackerToken = '';
let conversationId = '';
let proId = '';
const ts = Date.now();

beforeAll(async () => {
  await seed();

  const client = await request(app).post('/api/auth/register').send({
    name: 'Cliente Review',
    email: `review-c-${ts}@test.ao`,
    password: 'senha123',
    role: 'client',
  });
  clientToken = client.body.data.token;

  const pro = await request(app).post('/api/auth/register').send({
    name: 'Prof Review',
    email: `review-p-${ts}@test.ao`,
    password: 'senha123',
    role: 'professional',
  });
  proToken = pro.body.data.token;
  proId = pro.body.data.user.id;

  const attacker = await request(app).post('/api/auth/register').send({
    name: 'Cliente Fora',
    email: `review-x-${ts}@test.ao`,
    password: 'senha123',
    role: 'client',
  });
  attackerToken = attacker.body.data.token;

  const conv = await request(app)
    .post('/api/conversations')
    .set('Authorization', `Bearer ${clientToken}`)
    .send({ professionalId: proId });
  conversationId = conv.body.data.id;
});

it('client cria review 201 e o profile é actualizado', async () => {
  const res = await request(app)
    .post('/api/reviews')
    .set('Authorization', `Bearer ${clientToken}`)
    .send({ conversationId, stars: 4, comment: 'Bom trabalho' });
  expect(res.status).toBe(201);
  expect(res.body.data.stars).toBe(4);
  expect(res.body.data.reviewedId).toBe(proId);

  const { rows } = await pool.query(
    'select rating_avg, rating_count from professional_profiles where user_id = $1',
    [proId],
  );
  expect(rows[0].rating_count).toBe(1);
  expect(Number(rows[0].rating_avg)).toBeCloseTo(4, 5);
});

it('review cria mensagem de sistema kind rating na conversa', async () => {
  const { rows } = await pool.query(
    "select count(*)::int as n from messages where conversation_id = $1 and kind = 'rating'",
    [conversationId],
  );
  expect(rows[0].n).toBe(1);
});

it('segunda review na mesma conversa devolve 409 REVIEW_EXISTS', async () => {
  const res = await request(app)
    .post('/api/reviews')
    .set('Authorization', `Bearer ${clientToken}`)
    .send({ conversationId, stars: 5 });
  expect(res.status).toBe(409);
  expect(res.body.error.code).toBe('REVIEW_EXISTS');
});

it('stars 0 devolve 400 VALIDATION_ERROR', async () => {
  const res = await request(app)
    .post('/api/reviews')
    .set('Authorization', `Bearer ${clientToken}`)
    .send({ conversationId, stars: 0 });
  expect(res.status).toBe(400);
  expect(res.body.error.code).toBe('VALIDATION_ERROR');
});

it('profissional tenta avaliar e recebe 403', async () => {
  const res = await request(app)
    .post('/api/reviews')
    .set('Authorization', `Bearer ${proToken}`)
    .send({ conversationId, stars: 5 });
  expect(res.status).toBe(403);
  expect(res.body.error.code).toBe('FORBIDDEN');
});

it('cliente não-participante recebe 403', async () => {
  const res = await request(app)
    .post('/api/reviews')
    .set('Authorization', `Bearer ${attackerToken}`)
    .send({ conversationId, stars: 5 });
  expect(res.status).toBe(403);
  expect(res.body.error.code).toBe('FORBIDDEN');
});

it('sem token devolve 401', async () => {
  const res = await request(app)
    .post('/api/reviews')
    .send({ conversationId, stars: 5 });
  expect(res.status).toBe(401);
});
