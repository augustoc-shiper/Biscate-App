import request from 'supertest';
import { beforeAll, expect, it } from 'vitest';
import { createApp } from '../src/app.js';

const app = createApp();
const email = `auth-${Date.now()}@test.ao`;

const newUser = (mail = email) => ({
  name: 'Novo Cliente',
  email: mail,
  password: 'senha123',
  role: 'client' as const,
});

it('regista um cliente e devolve 201 com token', async () => {
  const res = await request(app).post('/api/auth/register').send(newUser());
  expect(res.status).toBe(201);
  expect(res.body.data.token).toBeTruthy();
  expect(res.body.data.user.email).toBe(email);
  expect(res.body.data.user.role).toBe('client');
  expect(JSON.stringify(res.body)).not.toContain('passwordHash');
  expect(JSON.stringify(res.body)).not.toContain('senha123');
});

it('email duplicado devolve 409 EMAIL_TAKEN', async () => {
  const res = await request(app).post('/api/auth/register').send(newUser());
  expect(res.status).toBe(409);
  expect(res.body.error.code).toBe('EMAIL_TAKEN');
});

it('registo com dados inválidos devolve 400 VALIDATION_ERROR', async () => {
  const res = await request(app)
    .post('/api/auth/register')
    .send({ name: 'X', email: 'nao-e-email', password: '1', role: 'client' });
  expect(res.status).toBe(400);
  expect(res.body.error.code).toBe('VALIDATION_ERROR');
});

it('login correcto devolve 200 com token', async () => {
  const res = await request(app)
    .post('/api/auth/login')
    .send({ email, password: 'senha123' });
  expect(res.status).toBe(200);
  expect(res.body.data.token).toBeTruthy();
  expect(res.body.data.user.email).toBe(email);
});

it('password errada devolve 401 INVALID_CREDENTIALS', async () => {
  const res = await request(app)
    .post('/api/auth/login')
    .send({ email, password: 'outra' });
  expect(res.status).toBe(401);
  expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
});

it('login de email inexistente devolve 401', async () => {
  const res = await request(app)
    .post('/api/auth/login')
    .send({ email: 'ninguem@test.ao', password: 'senha123' });
  expect(res.status).toBe(401);
  expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
});

let token = '';
let userId = '';

beforeAll(async () => {
  const res = await request(app)
    .post('/api/auth/register')
    .send(newUser(`me-${Date.now()}@test.ao`));
  token = res.body.data.token;
  userId = res.body.data.user.id;
});

it('GET /api/auth/me com token devolve o utilizador', async () => {
  const res = await request(app)
    .get('/api/auth/me')
    .set('Authorization', `Bearer ${token}`);
  expect(res.status).toBe(200);
  expect(res.body.data.id).toBe(userId);
});
