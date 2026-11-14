import request from 'supertest';
import { beforeAll, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { seed } from '../src/db/seed.js';

const app = createApp();
let token = '';
let manuelId = '';

beforeAll(async () => {
  await seed();
  const reg = await request(app).post('/api/auth/register').send({
    name: 'Cliente Favoritos',
    email: `fav-${Date.now()}@test.ao`,
    password: 'senha123',
    role: 'client',
  });
  token = reg.body.data.token;
  const list = await request(app).get('/api/professionals?q=manuel');
  manuelId = list.body.data[0].id;
});

it('sem token devolve 401', async () => {
  const res = await request(app).post(`/api/favorites/${manuelId}`);
  expect(res.status).toBe(401);
  expect(res.body.error.code).toBe('UNAUTHORIZED');
});

it('toggle adiciona e remove favorito', async () => {
  const add = await request(app)
    .post(`/api/favorites/${manuelId}`)
    .set('Authorization', `Bearer ${token}`);
  expect(add.status).toBe(200);
  expect(add.body.data.favorite).toBe(true);

  const list = await request(app)
    .get('/api/favorites')
    .set('Authorization', `Bearer ${token}`);
  expect(list.status).toBe(200);
  expect(
    list.body.data.map((p: { name: string }) => p.name),
  ).toContain('Manuel Kiala');

  const remove = await request(app)
    .post(`/api/favorites/${manuelId}`)
    .set('Authorization', `Bearer ${token}`);
  expect(remove.status).toBe(200);
  expect(remove.body.data.favorite).toBe(false);

  const list2 = await request(app)
    .get('/api/favorites')
    .set('Authorization', `Bearer ${token}`);
  expect(
    list2.body.data.map((p: { name: string }) => p.name),
  ).not.toContain('Manuel Kiala');
});

it('profissional inexistente devolve 404', async () => {
  const res = await request(app)
    .post('/api/favorites/nao-existe')
    .set('Authorization', `Bearer ${token}`);
  expect(res.status).toBe(404);
  expect(res.body.error.code).toBe('NOT_FOUND');
});
