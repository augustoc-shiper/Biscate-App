import fs from 'node:fs';
import path from 'node:path';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { afterAll, beforeAll, expect, it, vi } from 'vitest';
import { createApp } from '../src/app.js';
import { config } from '../src/config.js';
import { pool } from '../src/db/client.js';
import { seed } from '../src/db/seed.js';
import { addDays } from '../src/lib/clock.js';
import { UPLOAD_DIR } from '../src/middleware/upload.js';
import { sendMessage } from '../src/services/conversations.service.js';
import * as subs from '../src/services/subscriptions.service.js';

const app = createApp();
const T0 = new Date('2030-01-01T12:00:00.000Z');
const DAY = 24 * 60 * 60 * 1000;
const ADMIN_ID = 'subtest-admin';
// Sem expiração: o relógio é avançado nos testes do agendador.
const adminToken = jwt.sign({ id: ADMIN_ID, role: 'admin' }, config.jwtSecret);
const clientToken = jwt.sign(
  { id: 'subtest-token-client', role: 'client' },
  config.jwtSecret,
);

const png = Buffer.from('89504e470d0a1a0a0000000d49484452', 'hex');

beforeAll(async () => {
  await seed();
  await pool.query(
    `insert into users (id, name, email, password_hash, role)
     values ($1, 'Admin Teste', $2, 'x', 'admin')
     on conflict (id) do nothing`,
    [ADMIN_ID, `${ADMIN_ID}@subtest.ao`],
  );
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(T0);
});

afterAll(async () => {
  vi.useRealTimers();
  await pool.query(`
    delete from messages where conversation_id in (
      select id from conversations
       where client_id like 'subtest-%' or professional_id like 'subtest-%'
    )`);
  await pool.query(`
    delete from conversations
     where client_id like 'subtest-%' or professional_id like 'subtest-%'`);
  await pool.query(`delete from subscriptions where professional_id like 'subtest-%'`);
  await pool.query(`delete from payments where professional_id like 'subtest-%'`);
  await pool.query(`delete from professional_profiles where user_id like 'subtest-%'`);
  await pool.query(`delete from users where id like 'subtest-%'`);

  // O agendador com relógio de 2030 expirou os dados de demonstração; repomos
  // o baseline para não contaminar os outros ficheiros de teste.
  await pool.query(
    `update subscriptions set status = 'active'
      where status = 'expired' and professional_id like 'seed-user-%'`,
  );
  await seed();
});

async function insertPro(id: string): Promise<void> {
  await pool.query(
    `insert into users (id, name, email, password_hash, role)
     values ($1, $2, $3, 'x', 'professional')
     on conflict (id) do nothing`,
    [id, id, `${id}@subtest.ao`],
  );
  await pool.query(
    `insert into professional_profiles (user_id) values ($1) on conflict do nothing`,
    [id],
  );
}

async function insertClient(id: string): Promise<void> {
  await pool.query(
    `insert into users (id, name, email, password_hash, role)
     values ($1, $2, $3, 'x', 'client')
     on conflict (id) do nothing`,
    [id, id, `${id}@subtest.ao`],
  );
}

async function insertConversation(
  id: string,
  client: string,
  pro: string,
): Promise<void> {
  await pool.query(
    `insert into conversations (id, client_id, professional_id)
     values ($1, $2, $3) on conflict (id) do nothing`,
    [id, client, pro],
  );
}

async function getSub(id: string) {
  const r = await pool.query(`select * from subscriptions where id = $1`, [id]);
  return r.rows[0];
}

async function getPayment(id: string) {
  const r = await pool.query(`select * from payments where id = $1`, [id]);
  return r.rows[0];
}

async function getProfile(id: string) {
  const r = await pool.query(
    `select * from professional_profiles where user_id = $1`,
    [id],
  );
  return r.rows[0];
}

async function setup(tag: string, planId = 1, withConversation = true) {
  const pro = `subtest-${tag}-pro`;
  const client = `subtest-${tag}-client`;
  const conv = `subtest-${tag}-conv`;
  await insertPro(pro);
  await insertClient(client);
  if (withConversation) await insertConversation(conv, client, pro);
  const payment = await subs.createPayment(pro, planId, T0);
  await subs.attachProof(pro, payment.id, `/uploads/${tag}.png`, T0);
  return { pro, client, conv, payment };
}

/* ------------------------------------------------------------------ */

it('compra → comprovativo → aprovação → 1.ª mensagem válida activa', async () => {
  const { pro, client, conv, payment } = await setup('flow');
  let s = await getSub(payment.subscriptionId);
  expect(s.status).toBe('pending_payment');

  const approved = await subs.approvePayment(payment.id, ADMIN_ID, T0);
  expect(approved.applied).toBe(true);
  s = await getSub(payment.subscriptionId);
  expect(s.status).toBe('pending_activation');
  expect(s.expires_at).toBeNull();
  expect(new Date(s.activation_deadline).getTime()).toBe(addDays(T0, 3).getTime());
  expect(new Date(s.approved_at).getTime()).toBe(T0.getTime());

  // Durante a carência só a janela de descoberta está preenchida.
  let profile = await getProfile(pro);
  expect(profile.plan_expires_at).toBeNull();
  expect(new Date(profile.discoverable_until).getTime()).toBe(
    addDays(T0, 3).getTime(),
  );

  // Mensagem do profissional não activa.
  await sendMessage(conv, pro, { body: 'Olá', kind: 'text' }, T0);
  expect((await getSub(payment.subscriptionId)).status).toBe('pending_activation');

  // Mensagem válida do cliente activa com a duração COMPLETA do plano.
  const t1 = new Date(T0.getTime() + 1000);
  await sendMessage(conv, client, { body: 'Bom dia', kind: 'text' }, t1);
  s = await getSub(payment.subscriptionId);
  expect(s.status).toBe('active');
  expect(new Date(s.activated_at).getTime()).toBe(t1.getTime());
  expect(new Date(s.expires_at).getTime()).toBe(addDays(t1, 3).getTime());
  profile = await getProfile(pro);
  expect(new Date(profile.plan_expires_at).getTime()).toBe(addDays(t1, 3).getTime());
  expect(new Date(profile.discoverable_until).getTime()).toBe(addDays(t1, 3).getTime());
});

it('mensagens inválidas, anteriores à aprovação e cliente bloqueado não activam', async () => {
  const { pro, client, conv, payment } = await setup('invalid');
  await subs.approvePayment(payment.id, ADMIN_ID, T0);

  const msg = (over: Partial<Parameters<typeof subs.activateByMessage>[0]>) => ({
    conversationId: conv,
    clientId: client,
    professionalId: pro,
    kind: 'text',
    body: 'Bom dia',
    createdAt: new Date(T0.getTime() + 1000),
    ...over,
  });

  expect(await subs.activateByMessage(msg({ kind: 'image' }))).toMatchObject({
    activated: false,
    reason: 'invalid_message',
  });
  expect(await subs.activateByMessage(msg({ body: '   ' }))).toMatchObject({
    activated: false,
    reason: 'invalid_message',
  });
  expect(
    await subs.activateByMessage(msg({ createdAt: new Date(T0.getTime() - 1000) })),
  ).toMatchObject({ activated: false, reason: 'no_pending_activation' });
  expect(
    await subs.activateByMessage(msg({ professionalId: client })),
  ).toMatchObject({ activated: false });

  await pool.query(`update users set blocked = true where id = $1`, [client]);
  expect(await subs.activateByMessage(msg({}))).toMatchObject({
    activated: false,
    reason: 'client_not_eligible',
  });
  await pool.query(
    `update users set blocked = false, suspended = true where id = $1`,
    [client],
  );
  expect(await subs.activateByMessage(msg({}))).toMatchObject({
    activated: false,
    reason: 'client_not_eligible',
  });

  expect((await getSub(payment.subscriptionId)).status).toBe('pending_activation');
});

it('sendMessage e activação são atómicos: LOCK_BUSY não deixa mensagem e retry não duplica', async () => {
  const { client, conv, payment } = await setup('atomic');
  await subs.approvePayment(payment.id, ADMIN_ID, T0);
  const subId = payment.subscriptionId;

  // Lock externo na mesma BD de teste força a falha da activação.
  const locker = await pool.connect();
  try {
    await locker.query('begin');
    const lock = await locker.query(
      `select pg_try_advisory_xact_lock(hashtext($1)) as ok`,
      [`biskato:sub:${subId}`],
    );
    expect(lock.rows[0].ok).toBe(true);

    await expect(
      sendMessage(
        conv,
        client,
        { body: 'Mensagem atómica', kind: 'text' },
        new Date(T0.getTime() + 1000),
      ),
    ).rejects.toMatchObject({ code: 'LOCK_BUSY' });

    const during = await pool.query(
      `select count(*)::int as n from messages where conversation_id = $1`,
      [conv],
    );
    expect(during.rows[0].n).toBe(0);
    expect((await getSub(subId)).status).toBe('pending_activation');
  } finally {
    await locker.query('rollback');
    locker.release();
  }

  // Nova tentativa com o mesmo input: exactamente uma mensagem e uma activação.
  const tRetry = new Date(T0.getTime() + 2000);
  await sendMessage(conv, client, { body: 'Mensagem atómica', kind: 'text' }, tRetry);

  const after = await pool.query(
    `select count(*)::int as n from messages where conversation_id = $1`,
    [conv],
  );
  expect(after.rows[0].n).toBe(1);
  const s = await getSub(subId);
  expect(s.status).toBe('active');
  expect(new Date(s.activated_at).getTime()).toBe(tRetry.getTime());
});

it('aprovações simultâneas: uma só aplicação e um só período de carência', async () => {
  const { pro, payment } = await setup('concurrent');
  const results = await Promise.allSettled([
    subs.approvePayment(payment.id, ADMIN_ID, T0),
    subs.approvePayment(payment.id, ADMIN_ID, T0),
  ]);
  const applied = results.filter(
    (r) => r.status === 'fulfilled' && r.value.applied,
  );
  expect(applied).toHaveLength(1);

  // Invariantes por consulta directa à BD.
  const p = await getPayment(payment.id);
  expect(p.status).toBe('approved');
  expect(new Date(p.applied_at).getTime()).toBe(T0.getTime());
  const rows = await pool.query(
    `select * from subscriptions where professional_id = $1`,
    [pro],
  );
  expect(rows.rowCount).toBe(1);
  expect(rows.rows[0].status).toBe('pending_activation');
  expect(new Date(rows.rows[0].activation_deadline).getTime()).toBe(
    addDays(T0, 3).getTime(),
  );
});

it('aprovação repetida não reaplica nem altera o prazo', async () => {
  const { payment } = await setup('repeat');
  await subs.approvePayment(payment.id, ADMIN_ID, T0);
  const t1 = new Date(T0.getTime() + DAY);
  const second = await subs.approvePayment(payment.id, ADMIN_ID, t1);
  expect(second.applied).toBe(false);

  const before = await getSub(payment.subscriptionId);
  const p = await getPayment(payment.id);
  expect(new Date(p.applied_at).getTime()).toBe(T0.getTime());
  expect(new Date(before.activation_deadline).getTime()).toBe(
    addDays(T0, 3).getTime(),
  );
});

it('rejeição após aprovação não reverte o pagamento', async () => {
  const { payment } = await setup('reject');
  await subs.approvePayment(payment.id, ADMIN_ID, T0);
  const rejected = await subs.rejectPayment(
    payment.id,
    ADMIN_ID,
    new Date(T0.getTime() + DAY),
  );
  expect(rejected.rejected).toBe(false);

  const p = await getPayment(payment.id);
  expect(p.status).toBe('approved');
  expect(p.rejected_at).toBeNull();
  expect((await getSub(payment.subscriptionId)).status).toBe('pending_activation');
});

it('rejeição antes da aprovação é terminal e permite nova compra', async () => {
  const { pro, payment } = await setup('rejected');
  const rejected = await subs.rejectPayment(payment.id, ADMIN_ID, T0);
  expect(rejected.rejected).toBe(true);
  expect((await getSub(payment.subscriptionId)).status).toBe('rejected');
  expect((await getPayment(payment.id)).proof_url).toBeTruthy();

  const fresh = await subs.createPayment(pro, 2, new Date(T0.getTime() + 1000));
  expect(fresh.status).toBe('pending');
  const rows = await pool.query(
    `select status::text as status from subscriptions where professional_id = $1 order by created_at`,
    [pro],
  );
  expect(rows.rows.map((r) => r.status)).toEqual(['rejected', 'pending_payment']);
});

it('compra simultânea à aprovação não duplica subscrição nem aplica duas vezes', async () => {
  const { pro, payment } = await setup('buyapprove');
  const results = await Promise.allSettled([
    subs.createPayment(pro, 1, T0),
    subs.approvePayment(payment.id, ADMIN_ID, T0),
  ]);

  const rows = await pool.query(
    `select * from subscriptions where professional_id = $1`,
    [pro],
  );
  expect(rows.rowCount).toBe(1);
  expect(rows.rows[0].status).toBe('pending_activation');
  expect((await getPayment(payment.id)).status).toBe('approved');
  const payments = await pool.query(
    `select id, applied_at from payments where professional_id = $1`,
    [pro],
  );
  expect(payments.rows.filter((r) => r.applied_at).length).toBe(1);
  // A compra é barrada pelo estado pendente, independentemente da intercalação.
  expect(results[0].status).toBe('rejected');
  expect(results[1].status).toBe('fulfilled');
});

it('renovação acrescenta dias sem nova subscrição nem novo período de carência', async () => {
  const { pro, client, conv, payment } = await setup('renew');
  await subs.approvePayment(payment.id, ADMIN_ID, T0);
  const t1 = new Date(T0.getTime() + 1000);
  await sendMessage(conv, client, { body: 'Olá', kind: 'text' }, t1);
  const firstExpiry = addDays(t1, 3);

  const t2 = new Date(t1.getTime() + DAY);
  const renewal = await subs.createPayment(pro, 1, t2);
  expect(renewal.isRenewal).toBe(true);
  expect(renewal.subscriptionId).toBe(payment.subscriptionId);

  const t3 = new Date(t2.getTime() + DAY);
  await subs.approvePayment(renewal.id, ADMIN_ID, t3);

  const after = await getSub(payment.subscriptionId);
  expect(after.status).toBe('active');
  expect(new Date(after.expires_at).getTime()).toBe(addDays(firstExpiry, 3).getTime());
  expect(after.activation_deadline).toBeNull();
  const rows = await pool.query(
    `select count(*)::int as n from subscriptions where professional_id = $1`,
    [pro],
  );
  expect(rows.rows[0].n).toBe(1);
});

it('renovação usa o now injectado, não o now() do PostgreSQL', async () => {
  const { pro, client, conv, payment } = await setup('clock');
  await subs.approvePayment(payment.id, ADMIN_ID, T0);
  const tActivation = new Date(T0.getTime() + 1000);
  await sendMessage(conv, client, { body: 'Olá', kind: 'text' }, tActivation);
  const firstExpiry = addDays(tActivation, 3);

  const renewal = await subs.createPayment(pro, 1, new Date(T0.getTime() + DAY));
  // `now` injectado é posterior à expiração corrente: GREATEST deve escolhê-lo.
  // Se a BD usasse now() (2026), o resultado seria addDays(firstExpiry, 3).
  const tApprove = new Date(firstExpiry.getTime() + 60 * 60 * 1000);
  await subs.approvePayment(renewal.id, ADMIN_ID, tApprove);

  const s = await getSub(payment.subscriptionId);
  expect(new Date(s.expires_at).getTime()).toBe(addDays(tApprove, 3).getTime());

  const clock = await pool.query(
    `select (expires_at > now()) as futuro from subscriptions where id = $1`,
    [payment.subscriptionId],
  );
  expect(clock.rows[0].futuro).toBe(true);
  const rows = await pool.query(
    `select count(*)::int as n from subscriptions where professional_id = $1`,
    [pro],
  );
  expect(rows.rows[0].n).toBe(1);
});

it('renovação aprovada após expiração cria nova subscrição sem reaproveitar a antiga', async () => {
  const { pro, client, conv, payment } = await setup('late-renew');
  await subs.approvePayment(payment.id, ADMIN_ID, T0);
  const t1 = new Date(T0.getTime() + 1000);
  await sendMessage(conv, client, { body: 'Olá', kind: 'text' }, t1);
  const firstExpiry = addDays(t1, 3);

  const t2 = new Date(t1.getTime() + DAY);
  const renewal = await subs.createPayment(pro, 1, t2);
  expect(renewal.isRenewal).toBe(true);

  const tExpiry = new Date(firstExpiry.getTime() + 1000);
  await subs.runSubscriptionsJob(tExpiry);
  expect((await getSub(payment.subscriptionId)).status).toBe('expired');

  const approved = await subs.approvePayment(renewal.id, ADMIN_ID, tExpiry);
  expect(approved.applied).toBe(true);
  expect(approved.subscription?.id).not.toBe(payment.subscriptionId);
  expect(approved.subscription?.status).toBe('pending_activation');
  const rows = await pool.query(
    `select status::text as status from subscriptions where professional_id = $1 order by created_at`,
    [pro],
  );
  expect(rows.rows.map((r) => r.status)).toEqual(['expired', 'pending_activation']);
});

it('primeira mensagem válida e agendador em simultâneo: uma só activação sem sobrescrita', async () => {
  const { pro, client, conv, payment } = await setup('race-activation');
  await subs.approvePayment(payment.id, ADMIN_ID, T0);
  const subId = payment.subscriptionId;
  const tMessage = new Date(T0.getTime() + 60 * 60 * 1000);
  const tJob = addDays(T0, 3); // exactamente o limite de carência

  const [messageResult, jobResult] = await Promise.allSettled([
    subs.activateByMessage(
      {
        conversationId: conv,
        clientId: client,
        professionalId: pro,
        kind: 'text',
        body: 'Primeira mensagem válida',
        createdAt: tMessage,
      },
      tMessage,
    ),
    subs.runSubscriptionsJob(tJob),
  ]);

  expect(messageResult.status).toBe('fulfilled');
  expect(jobResult.status).toBe('fulfilled');
  const messageActivated =
    messageResult.status === 'fulfilled' && messageResult.value.activated === true;
  expect(jobResult.status === 'fulfilled' && jobResult.value.ran).toBe(true);

  // Invariantes por consulta directa à BD de teste.
  const rows = await pool.query(
    `select status::text as status, activated_at, activation_deadline,
            expires_at, updated_at
       from subscriptions where id = $1`,
    [subId],
  );
  expect(rows.rowCount).toBe(1);
  const s = rows.rows[0];
  expect(s.status).toBe('active');
  expect(s.activation_deadline).toBeNull();

  const jobActivatedThisSub = new Date(s.activated_at).getTime() === tJob.getTime();
  expect(Number(messageActivated) + Number(jobActivatedThisSub)).toBe(1);

  const winner = messageActivated ? tMessage : tJob;
  expect(new Date(s.activated_at).getTime()).toBe(winner.getTime());
  expect(new Date(s.updated_at).getTime()).toBe(winner.getTime());
  expect(new Date(s.expires_at).getTime()).toBe(addDays(winner, 3).getTime());

  const profile = await getProfile(pro);
  expect(new Date(profile.plan_expires_at).getTime()).toBe(addDays(winner, 3).getTime());
  expect(new Date(profile.discoverable_until).getTime()).toBe(addDays(winner, 3).getTime());
});

it('agendador activa por prazo e depois expira', async () => {
  const { pro, payment } = await setup('sched');
  await subs.approvePayment(payment.id, ADMIN_ID, T0);

  const tDeadline = addDays(T0, 3);
  const first = await subs.runSubscriptionsJob(tDeadline);
  expect(first.ran).toBe(true);
  expect(first.activated).toBeGreaterThanOrEqual(1);
  let s = await getSub(payment.subscriptionId);
  expect(s.status).toBe('active');
  expect(new Date(s.activated_at).getTime()).toBe(tDeadline.getTime());
  expect(new Date(s.expires_at).getTime()).toBe(addDays(tDeadline, 3).getTime());

  const tExpiry = new Date(addDays(tDeadline, 3).getTime() + 1000);
  const second = await subs.runSubscriptionsJob(tExpiry);
  expect(second.expired).toBeGreaterThanOrEqual(1);
  s = await getSub(payment.subscriptionId);
  expect(s.status).toBe('expired');
  const profile = await getProfile(pro);
  expect(new Date(profile.plan_expires_at).getTime()).toBe(tExpiry.getTime());
});

it('admin: autenticação, listagem, aprovação e leitura do comprovativo', async () => {
  const { pro, payment } = await setup('adminhttp');
  const fileName = `subtest-proof-${ADMIN_ID}.png`;
  fs.writeFileSync(path.join(UPLOAD_DIR, fileName), png);
  await subs.attachProof(pro, payment.id, `/uploads/${fileName}`, T0);

  const list = await request(app)
    .get('/api/admin/payments')
    .set('Authorization', `Bearer ${adminToken}`);
  expect(list.status).toBe(200);
  expect(list.body.data.some((p: { id: string }) => p.id === payment.id)).toBe(true);

  const noToken = await request(app).get('/api/admin/payments');
  expect(noToken.status).toBe(401);
  const denied = await request(app)
    .get('/api/admin/payments')
    .set('Authorization', `Bearer ${clientToken}`);
  expect(denied.status).toBe(403);

  const proof = await request(app)
    .get(`/api/admin/payments/${payment.id}/proof`)
    .set('Authorization', `Bearer ${adminToken}`);
  expect(proof.status).toBe(200);
  expect(proof.headers['content-type']).toContain('image/png');

  const approved = await request(app)
    .post(`/api/admin/payments/${payment.id}/approve`)
    .set('Authorization', `Bearer ${adminToken}`);
  expect(approved.status).toBe(200);
  expect(approved.body.data.applied).toBe(true);
  expect(approved.body.data.payment.status).toBe('approved');

  fs.rmSync(path.join(UPLOAD_DIR, fileName), { force: true });
});

it('segunda mensagem válida não activa novamente', async () => {
  const { client, conv, payment } = await setup('twice');
  await subs.approvePayment(payment.id, ADMIN_ID, T0);
  const t1 = new Date(T0.getTime() + 1000);
  await sendMessage(conv, client, { body: 'Primeira', kind: 'text' }, t1);
  const t2 = new Date(T0.getTime() + 2000);
  await sendMessage(conv, client, { body: 'Segunda', kind: 'text' }, t2);

  const s = await getSub(payment.subscriptionId);
  expect(new Date(s.activated_at).getTime()).toBe(t1.getTime());
  const rows = await pool.query(
    `select count(*)::int as n from subscriptions where professional_id = $1`,
    [payment.professionalId],
  );
  expect(rows.rows[0].n).toBe(1);
});
