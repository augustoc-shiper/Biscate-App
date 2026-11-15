import request from 'supertest';
import { beforeAll, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { db } from '../src/db/client.js';
import { seed } from '../src/db/seed.js';
import { notify } from '../src/services/notifications.service.js';

const app = createApp();

let tokenA = '';
let idA = '';
let tokenB = '';
let idB = '';
const ts = Date.now();

beforeAll(async () => {
  await seed();

  const a = await request(app).post('/api/auth/register').send({
    name: 'Cliente Notif',
    email: `notif-a-${ts}@test.ao`,
    password: 'senha123',
    role: 'client',
  });
  tokenA = a.body.data.token;
  idA = a.body.data.user.id;

  const b = await request(app).post('/api/auth/register').send({
    name: 'Cliente Notif B',
    email: `notif-b-${ts}@test.ao`,
    password: 'senha123',
    role: 'client',
  });
  tokenB = b.body.data.token;
  idB = b.body.data.user.id;
});

it('notify cria rows; GET lista só as do próprio com meta.unread', async () => {
  await notify(db, idA, 'chat', 'Joaquim respondeu');
  await notify(db, idA, 'offer', 'Nova proposta de 7500 Kz');
  await notify(db, idB, 'chat', 'não devo ver isto');

  const res = await request(app)
    .get('/api/notifications')
    .set('Authorization', `Bearer ${tokenA}`);
  expect(res.status).toBe(200);
  expect(res.body.data).toHaveLength(2);
  expect(res.body.meta.unread).toBe(2);
  const bodies = res.body.data.map((n: { body: string }) => n.body);
  expect(bodies).toContain('Joaquim respondeu');
  expect(bodies).not.toContain('não devo ver isto');
  expect(res.body.data[0]).toHaveProperty('kind');
  expect(res.body.data[0]).toHaveProperty('readAt');
  expect(res.body.data[0]).toHaveProperty('createdAt');
});

it('POST read sem ids marca todas → unread 0', async () => {
  const read = await request(app)
    .post('/api/notifications/read')
    .set('Authorization', `Bearer ${tokenA}`)
    .send({});
  expect(read.status).toBe(200);
  expect(read.body.data.updated).toBe(2);

  const res = await request(app)
    .get('/api/notifications')
    .set('Authorization', `Bearer ${tokenA}`);
  expect(res.body.meta.unread).toBe(0);
});

it('POST read com ids marca só essas', async () => {
  await notify(db, idA, 'chat', 'uma por ler');
  await notify(db, idA, 'chat', 'outra por ler');

  const list = await request(app)
    .get('/api/notifications')
    .set('Authorization', `Bearer ${tokenA}`);
  const unreadIds: string[] = list.body.data
    .filter((n: { readAt: string | null }) => n.readAt === null)
    .map((n: { id: string }) => n.id);
  expect(unreadIds).toHaveLength(2);

  const read = await request(app)
    .post('/api/notifications/read')
    .set('Authorization', `Bearer ${tokenA}`)
    .send({ ids: [unreadIds[0]] });
  expect(read.status).toBe(200);
  expect(read.body.data.updated).toBe(1);

  const res = await request(app)
    .get('/api/notifications')
    .set('Authorization', `Bearer ${tokenA}`);
  expect(res.body.meta.unread).toBe(1);
});

it('read com ids alheios não marca nada', async () => {
  const bNotifs = await request(app)
    .get('/api/notifications')
    .set('Authorization', `Bearer ${tokenB}`);
  const bId = bNotifs.body.data[0].id;

  const read = await request(app)
    .post('/api/notifications/read')
    .set('Authorization', `Bearer ${tokenA}`)
    .send({ ids: [bId] });
  expect(read.status).toBe(200);
  expect(read.body.data.updated).toBe(0);
});

it('sem token devolve 401', async () => {
  const res = await request(app).get('/api/notifications');
  expect(res.status).toBe(401);
});
