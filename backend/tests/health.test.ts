import request from 'supertest';
import { expect, it } from 'vitest';
import { createApp } from '../src/app.js';

const app = createApp();

it('GET /api/health devolve data.status = ok', async () => {
  const res = await request(app).get('/api/health');
  expect(res.status).toBe(200);
  expect(res.body).toEqual({ data: { status: 'ok' } });
});

it('rota inexistente devolve 404 com code NOT_FOUND', async () => {
  const res = await request(app).get('/api/rota-inexistente');
  expect(res.status).toBe(404);
  expect(res.body.error.code).toBe('NOT_FOUND');
  expect(res.body.error.message).toBeTruthy();
});

it('exceção não tratada devolve 500 com code INTERNAL', async () => {
  const express = (await import('express')).default;
  const { errorHandler } = await import('../src/middleware/error.js');
  const boomApp = express();
  boomApp.get('/api/__boom', () => {
    throw new Error('boom');
  });
  boomApp.use(errorHandler);
  const res = await request(boomApp).get('/api/__boom');
  expect(res.status).toBe(500);
  expect(res.body.error.code).toBe('INTERNAL');
  expect(res.body.error.message).toBe('Erro interno do servidor');
});
