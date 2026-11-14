import jwt from 'jsonwebtoken';
import request from 'supertest';
import { beforeAll, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { config } from '../src/config.js';

const app = createApp();

let validToken = '';
let expiredToken = '';

beforeAll(async () => {
  const res = await request(app).post('/api/auth/register').send({
    name: 'Middleware Test',
    email: `mw-${Date.now()}@test.ao`,
    password: 'senha123',
    role: 'client',
  });
  validToken = res.body.data.token;
  expiredToken = jwt.sign(
    { id: 'qualquer', role: 'client' },
    config.jwtSecret,
    { expiresIn: '-1s' },
  );
});

it('sem header devolve 401 UNAUTHORIZED', async () => {
  const res = await request(app).get('/api/auth/me');
  expect(res.status).toBe(401);
  expect(res.body.error.code).toBe('UNAUTHORIZED');
});

it('token inválido devolve 401 UNAUTHORIZED', async () => {
  const res = await request(app)
    .get('/api/auth/me')
    .set('Authorization', 'Bearer abc.def.ghi');
  expect(res.status).toBe(401);
  expect(res.body.error.code).toBe('UNAUTHORIZED');
});

it('token expirado devolve 401 UNAUTHORIZED', async () => {
  const res = await request(app)
    .get('/api/auth/me')
    .set('Authorization', `Bearer ${expiredToken}`);
  expect(res.status).toBe(401);
  expect(res.body.error.code).toBe('UNAUTHORIZED');
});

it('token válido devolve 200 com req.user', async () => {
  const res = await request(app)
    .get('/api/auth/me')
    .set('Authorization', `Bearer ${validToken}`);
  expect(res.status).toBe(200);
  expect(res.body.data.id).toBeTruthy();
  expect(res.body.data.role).toBe('client');
});
