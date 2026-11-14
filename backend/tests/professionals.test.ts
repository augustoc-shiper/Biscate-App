import request from 'supertest';
import { beforeAll, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { seed } from '../src/db/seed.js';

const app = createApp();

beforeAll(async () => {
  await seed();
});

it('lista profissionais com plano activo e meta correcta', async () => {
  const res = await request(app).get('/api/professionals');
  expect(res.status).toBe(200);
  expect(res.body.data.length).toBe(6);
  expect(res.body.meta.total).toBe(6);
  expect(res.body.meta.page).toBe(1);
  expect(res.body.data[0]).toHaveProperty('ratingAvg');
  expect(res.body.data[0]).toHaveProperty('bairro');
  expect(res.body.data[0]).toHaveProperty('verified');
});

it('exclui profissionais sem plano activo', async () => {
  const reg = await request(app).post('/api/auth/register').send({
    name: 'Sem Plano',
    email: `semplano-${Date.now()}@test.ao`,
    password: 'senha123',
    role: 'professional',
  });
  expect(reg.status).toBe(201);
  const res = await request(app).get('/api/professionals');
  expect(res.body.meta.total).toBe(6);
  const names = res.body.data.map((p: { name: string }) => p.name);
  expect(names).not.toContain('Sem Plano');
});

it('filtra por categoria', async () => {
  const res = await request(app).get('/api/professionals?category=Pedreiro');
  expect(res.status).toBe(200);
  expect(res.body.data.length).toBeGreaterThanOrEqual(1);
  for (const p of res.body.data) expect(p.category).toBe('Pedreiro');
});

it('filtra por bairro', async () => {
  const res = await request(app).get('/api/professionals?bairro=Cazenga');
  expect(res.status).toBe(200);
  expect(res.body.data.map((p: { name: string }) => p.name)).toContain(
    'Manuel Kiala',
  );
  for (const p of res.body.data) expect(p.bairro).toBe('Cazenga');
});

it('pesquisa por texto livre', async () => {
  const res = await request(app).get('/api/professionals?q=manuel');
  expect(res.status).toBe(200);
  expect(res.body.data.map((p: { name: string }) => p.name)).toContain(
    'Manuel Kiala',
  );
});

it('ordena por nota decrescente com sort=rating', async () => {
  const res = await request(app).get('/api/professionals?sort=rating');
  const ratings = res.body.data.map(
    (p: { ratingAvg: number }) => p.ratingAvg,
  );
  expect(ratings[0]).toBeGreaterThanOrEqual(ratings[ratings.length - 1]);
  expect(res.body.data[0].name).toBe('Teresa Domingos');
});

it('ordena por preço crescente com sort=price', async () => {
  const res = await request(app).get('/api/professionals?sort=price');
  const prices = res.body.data.map((p: { priceMin: number }) => p.priceMin);
  const sorted = [...prices].sort((a, b) => a - b);
  expect(prices).toEqual(sorted);
});

it('devolve detalhe com fotos e avaliações', async () => {
  const list = await request(app).get('/api/professionals?q=manuel');
  const id = list.body.data[0].id;
  const res = await request(app).get(`/api/professionals/${id}`);
  expect(res.status).toBe(200);
  expect(res.body.data.name).toBe('Manuel Kiala');
  expect(res.body.data.bio).toContain('Pedreiro');
  expect(Array.isArray(res.body.data.workPhotos)).toBe(true);
  expect(Array.isArray(res.body.data.reviews)).toBe(true);
  expect(res.body.data.reviews.length).toBeGreaterThanOrEqual(2);
  expect(res.body.data).not.toHaveProperty('email');
  expect(res.body.data).not.toHaveProperty('passwordHash');
});

it('detalhe inexistente devolve 404', async () => {
  const res = await request(app).get('/api/professionals/nao-existe');
  expect(res.status).toBe(404);
  expect(res.body.error.code).toBe('NOT_FOUND');
});

it('GET /api/categories devolve 8 e /api/bairro devolve 6', async () => {
  const cats = await request(app).get('/api/categories');
  expect(cats.status).toBe(200);
  expect(cats.body.data).toHaveLength(8);
  const bs = await request(app).get('/api/bairro');
  expect(bs.status).toBe(200);
  expect(bs.body.data).toHaveLength(6);
});
