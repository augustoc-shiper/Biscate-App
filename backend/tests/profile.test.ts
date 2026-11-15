import fs from 'node:fs';
import path from 'node:path';
import request from 'supertest';
import { afterAll, beforeAll, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { pool } from '../src/db/client.js';
import { seed } from '../src/db/seed.js';

const app = createApp();

let ownerToken = '';
let ownerId = '';
let otherToken = '';
let clientToken = '';
let photoId = '';
let photoUrl = '';
const uploadedFiles: string[] = [];
const ts = Date.now();

const png = (bytes: number): Buffer => {
  const buf = Buffer.alloc(bytes);
  // cabeçalho PNG válido mínimo para o fileFilter não rejeitar
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(buf);
  return buf;
};

beforeAll(async () => {
  await seed();

  const owner = await request(app).post('/api/auth/register').send({
    name: 'Prof Owner',
    email: `prof-o-${ts}@test.ao`,
    password: 'senha123',
    role: 'professional',
  });
  ownerToken = owner.body.data.token;
  ownerId = owner.body.data.user.id;

  const other = await request(app).post('/api/auth/register').send({
    name: 'Prof Other',
    email: `prof-t-${ts}@test.ao`,
    password: 'senha123',
    role: 'professional',
  });
  otherToken = other.body.data.token;

  const client = await request(app).post('/api/auth/register').send({
    name: 'Cliente Profile',
    email: `prof-c-${ts}@test.ao`,
    password: 'senha123',
    role: 'client',
  });
  clientToken = client.body.data.token;
});

afterAll(() => {
  for (const file of uploadedFiles) {
    try {
      fs.unlinkSync(file);
    } catch {
      // já removido pelo DELETE
    }
  }
});

it('PUT /api/profile actualiza os campos', async () => {
  const cats = await request(app).get('/api/categories');
  const bairros = await request(app).get('/api/bairro');

  const res = await request(app)
    .put('/api/profile')
    .set('Authorization', `Bearer ${ownerToken}`)
    .send({
      bio: 'Especialista em reparações rápidas.',
      priceText: '5000 Kz/dia',
      categoryId: cats.body.data[0].id,
      bairroId: bairros.body.data[0].id,
      availableToday: true,
      responseTime: 'responde em 1 hora',
    });
  expect(res.status).toBe(200);
  expect(res.body.data.bio).toBe('Especialista em reparações rápidas.');
  expect(res.body.data.priceText).toBe('5000 Kz/dia');
  expect(res.body.data.availableToday).toBe(true);
  expect(res.body.data.responseTime).toBe('responde em 1 hora');
  expect(res.body.data.categoryId).toBe(cats.body.data[0].id);

  const { rows } = await pool.query(
    'select bio from users where id = $1',
    [ownerId],
  );
  expect(rows[0].bio).toBe('Especialista em reparações rápidas.');
});

it('cliente não pode editar profile (403)', async () => {
  const res = await request(app)
    .put('/api/profile')
    .set('Authorization', `Bearer ${clientToken}`)
    .send({ bio: 'não devo conseguir' });
  expect(res.status).toBe(403);
});

it('POST /api/profile/photos grava ficheiro e row', async () => {
  const res = await request(app)
    .post('/api/profile/photos')
    .set('Authorization', `Bearer ${ownerToken}`)
    .attach('photo', png(64), { filename: 'obra.png', contentType: 'image/png' });
  expect(res.status).toBe(201);
  expect(res.body.data.url).toMatch(/^\/uploads\/.+\.png$/);
  photoUrl = res.body.data.url;
  photoId = res.body.data.id;

  const { rows } = await pool.query(
    'select count(*)::int as n from work_photos where professional_id = $1',
    [ownerId],
  );
  expect(rows[0].n).toBe(1);

  const filePath = path.join(process.cwd(), 'uploads', path.basename(photoUrl));
  expect(fs.existsSync(filePath)).toBe(true);
  uploadedFiles.push(filePath);
});

it('foto acima de 5MB devolve 400', async () => {
  const res = await request(app)
    .post('/api/profile/photos')
    .set('Authorization', `Bearer ${ownerToken}`)
    .attach('photo', png(6 * 1024 * 1024), {
      filename: 'grande.png',
      contentType: 'image/png',
    });
  expect(res.status).toBe(400);

  const { rows } = await pool.query(
    'select count(*)::int as n from work_photos where professional_id = $1',
    [ownerId],
  );
  expect(rows[0].n).toBe(1);
});

it('tipo não-suportado devolve 400', async () => {
  const res = await request(app)
    .post('/api/profile/photos')
    .set('Authorization', `Bearer ${ownerToken}`)
    .attach('photo', png(64), { filename: 'notas.pdf', contentType: 'application/pdf' });
  expect(res.status).toBe(400);
});

it('mais de 6 fotos devolve 400', async () => {
  for (let i = 2; i <= 6; i++) {
    const res = await request(app)
      .post('/api/profile/photos')
      .set('Authorization', `Bearer ${ownerToken}`)
      .attach('photo', png(64), {
        filename: `obra-${i}.png`,
        contentType: 'image/png',
      });
    expect(res.status).toBe(201);
    uploadedFiles.push(
      path.join(process.cwd(), 'uploads', path.basename(res.body.data.url)),
    );
  }

  const res = await request(app)
    .post('/api/profile/photos')
    .set('Authorization', `Bearer ${ownerToken}`)
    .attach('photo', png(64), { filename: 'sétima.png', contentType: 'image/png' });
  expect(res.status).toBe(400);
  expect(res.body.error.code).toBe('PHOTO_LIMIT');

  const { rows } = await pool.query(
    'select count(*)::int as n from work_photos where professional_id = $1',
    [ownerId],
  );
  expect(rows[0].n).toBe(6);
});

it('outro profissional não apaga foto alheia (403)', async () => {
  const res = await request(app)
    .delete(`/api/profile/photos/${photoId}`)
    .set('Authorization', `Bearer ${otherToken}`);
  expect(res.status).toBe(403);
  expect(res.body.error.code).toBe('FORBIDDEN');
});

it('dono apaga a própria foto (200)', async () => {
  const res = await request(app)
    .delete(`/api/profile/photos/${photoId}`)
    .set('Authorization', `Bearer ${ownerToken}`);
  expect(res.status).toBe(200);

  const { rows } = await pool.query(
    'select count(*)::int as n from work_photos where professional_id = $1',
    [ownerId],
  );
  expect(rows[0].n).toBe(5);

  const filePath = path.join(process.cwd(), 'uploads', path.basename(photoUrl));
  expect(fs.existsSync(filePath)).toBe(false);
});

it('sem token devolve 401', async () => {
  const res = await request(app).put('/api/profile').send({ bio: 'x' });
  expect(res.status).toBe(401);
});
