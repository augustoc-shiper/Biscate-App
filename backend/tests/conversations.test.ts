import request from 'supertest';
import { beforeAll, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { seed } from '../src/db/seed.js';

const app = createApp();

let clientToken = '';
let proToken = '';
let attackerToken = '';
let conversationId = '';
const ts = Date.now();

beforeAll(async () => {
  await seed();
  const client = await request(app).post('/api/auth/register').send({
    name: 'Cliente Chat',
    email: `chat-${ts}@test.ao`,
    password: 'senha123',
    role: 'client',
  });
  clientToken = client.body.data.token;

  const pro = await request(app)
    .post('/api/auth/login')
    .send({ email: 'profissional@biscate.ao', password: 'biscate123' });
  proToken = pro.body.data.token;

  const attacker = await request(app).post('/api/auth/register').send({
    name: 'Atacante',
    email: `ataque-${ts}@test.ao`,
    password: 'senha123',
    role: 'client',
  });
  attackerToken = attacker.body.data.token;
});

it('criar conversa devolve 201 e a segunda vez reutiliza a mesma', async () => {
  const list = await request(app).get('/api/professionals?q=joaquim');
  const proId = list.body.data[0].id;

  const first = await request(app)
    .post('/api/conversations')
    .set('Authorization', `Bearer ${clientToken}`)
    .send({ professionalId: proId });
  expect(first.status).toBe(201);
  expect(first.body.data.id).toBeTruthy();
  conversationId = first.body.data.id;

  const second = await request(app)
    .post('/api/conversations')
    .set('Authorization', `Bearer ${clientToken}`)
    .send({ professionalId: proId });
  expect([200, 201]).toContain(second.status);
  expect(second.body.data.id).toBe(conversationId);
});

it('profissional envia mensagem e recebe 201', async () => {
  const res = await request(app)
    .post(`/api/conversations/${conversationId}/messages`)
    .set('Authorization', `Bearer ${proToken}`)
    .send({ body: 'Bom dia! Posso ajudar com o quadro.' });
  expect(res.status).toBe(201);
  expect(res.body.data.kind).toBe('text');
  expect(res.body.data.body).toContain('Bom dia');
});

it('GET messages devolve as mensagens e marca como lidas', async () => {
  const res = await request(app)
    .get(`/api/conversations/${conversationId}/messages`)
    .set('Authorization', `Bearer ${clientToken}`);
  expect(res.status).toBe(200);
  expect(res.body.data.length).toBeGreaterThanOrEqual(1);
  expect(res.body.data[0]).toHaveProperty('senderName');
  expect(res.body.meta).toHaveProperty('total');

  const convs = await request(app)
    .get('/api/conversations')
    .set('Authorization', `Bearer ${clientToken}`);
  expect(convs.status).toBe(200);
  const conv = convs.body.data.find(
    (c: { id: string }) => c.id === conversationId,
  );
  expect(conv).toBeTruthy();
  expect(conv.unreadCount).toBe(0);
  expect(conv.peer.name).toBe('Joaquim Neto');
});

it('cliente envia mensagem; profissional vê 1 não lida e ao ler zera', async () => {
  await request(app)
    .post(`/api/conversations/${conversationId}/messages`)
    .set('Authorization', `Bearer ${clientToken}`)
    .send({ body: 'Preciso de ajuda hoje.' });

  const proConvs = await request(app)
    .get('/api/conversations')
    .set('Authorization', `Bearer ${proToken}`);
  const conv = proConvs.body.data.find(
    (c: { id: string }) => c.id === conversationId,
  );
  expect(conv.unreadCount).toBe(1);

  await request(app)
    .get(`/api/conversations/${conversationId}/messages`)
    .set('Authorization', `Bearer ${proToken}`);

  const clientConvs = await request(app)
    .get('/api/conversations')
    .set('Authorization', `Bearer ${clientToken}`);
  const after = clientConvs.body.data.find(
    (c: { id: string }) => c.id === conversationId,
  );
  expect(after.unreadCount).toBe(0);
});

it('não-participante recebe 403 em GET e POST messages', async () => {
  const get = await request(app)
    .get(`/api/conversations/${conversationId}/messages`)
    .set('Authorization', `Bearer ${attackerToken}`);
  expect(get.status).toBe(403);
  expect(get.body.error.code).toBe('FORBIDDEN');

  const post = await request(app)
    .post(`/api/conversations/${conversationId}/messages`)
    .set('Authorization', `Bearer ${attackerToken}`)
    .send({ body: 'invasão' });
  expect(post.status).toBe(403);
});

it('mensagem sem body devolve 400 VALIDATION_ERROR', async () => {
  const res = await request(app)
    .post(`/api/conversations/${conversationId}/messages`)
    .set('Authorization', `Bearer ${clientToken}`)
    .send({ body: '' });
  expect(res.status).toBe(400);
  expect(res.body.error.code).toBe('VALIDATION_ERROR');
});

it('sem token devolve 401', async () => {
  const res = await request(app).get('/api/conversations');
  expect(res.status).toBe(401);
});
