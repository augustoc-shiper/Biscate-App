import { createServer, type Server } from 'node:http';
import request from 'supertest';
import { io as ioc, type Socket as ClientSocket } from 'socket.io-client';
import {
  afterAll,
  beforeAll,
  expect,
  it,
} from 'vitest';
import { createApp } from '../src/app.js';
import { config } from '../src/config.js';
import { pool } from '../src/db/client.js';
import { seed } from '../src/db/seed.js';
import { createSocketServer } from '../src/sockets/index.js';

const ts = Date.now();
let server: Server;
let url = '';
let clientAToken = '';
let clientAId = '';
let proToken = '';
let proId = '';
let attackerToken = '';
let conversationId = '';

function connect(token?: string): Promise<ClientSocket> {
  return new Promise((resolve, reject) => {
    const socket = ioc(url, {
      auth: token ? { token } : {},
      transports: ['websocket'],
      reconnection: false,
      timeout: 3000,
    });
    const onConnect = () => {
      socket.off('connect_error', onError);
      resolve(socket);
    };
    const onError = (err: Error) => {
      socket.off('connect', onConnect);
      reject(err);
    };
    socket.once('connect', onConnect);
    socket.once('connect_error', onError);
  });
}

function waitFor<T>(socket: ClientSocket, event: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`timeout ao esperar "${event}"`)),
      4000,
    );
    socket.once(event, (payload: T) => {
      clearTimeout(timer);
      resolve(payload);
    });
  });
}

function ackEmit<T = unknown>(
  socket: ClientSocket,
  event: string,
  payload: unknown,
): Promise<{ error: unknown; data: T | undefined }> {
  return new Promise((resolve, reject) => {
    socket.timeout(4000).emit(event, payload, (err: Error | null, ...args: unknown[]) => {
      if (err) {
        reject(new Error(`ack timeout em "${event}"`));
        return;
      }
      resolve({ error: args[0], data: args[1] as T | undefined });
    });
  });
}

beforeAll(async () => {
  await seed();

  const app = createApp();
  const a = await request(app).post('/api/auth/register').send({
    name: 'Socket Cliente A',
    email: `socket-a-${ts}@test.ao`,
    password: 'senha123',
    role: 'client',
  });
  clientAToken = a.body.data.token;
  clientAId = a.body.data.user.id;

  const b = await request(app).post('/api/auth/register').send({
    name: 'Socket Prof B',
    email: `socket-b-${ts}@test.ao`,
    password: 'senha123',
    role: 'professional',
  });
  proToken = b.body.data.token;
  proId = b.body.data.user.id;

  const c = await request(app).post('/api/auth/register').send({
    name: 'Socket Atacante C',
    email: `socket-c-${ts}@test.ao`,
    password: 'senha123',
    role: 'client',
  });
  attackerToken = c.body.data.token;

  const conv = await request(app)
    .post('/api/conversations')
    .set('Authorization', `Bearer ${clientAToken}`)
    .send({ professionalId: proId });
  expect(conv.status).toBe(201);
  conversationId = conv.body.data.id;

  server = createServer(app);
  createSocketServer(server, { corsOrigin: config.corsOrigin });
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address();
  if (address === null || typeof address === 'string') {
    throw new Error('sem porta atribuída');
  }
  url = `http://localhost:${address.port}`;
});

afterAll(async () => {
  await new Promise<void>((resolve) => {
    server.close(() => resolve());
  });
  await pool.end();
});

it('sem token é rejeitado no handshake', async () => {
  await expect(connect()).rejects.toThrow();
});

it('participante faz join com ack sem erro e recebe presença do par', async () => {
  const socketB = await connect(proToken);
  const socketA = await connect(clientAToken);

  const joinB = await ackEmit(socketB, 'conversation:join', {
    conversationId,
  });
  expect(joinB.error).toBeFalsy();

  const presenceB = waitFor<{ userId: string; online: boolean }>(
    socketB,
    'presence',
  );
  const joinA = await ackEmit(socketA, 'conversation:join', {
    conversationId,
  });
  expect(joinA.error).toBeFalsy();

  const presence = await presenceB;
  expect(presence.userId).toBe(clientAId);
  expect(presence.online).toBe(true);

  socketA.disconnect();
  socketB.disconnect();
});

it('message:send persiste uma vez, ack devolve id e o par recebe message:new', async () => {
  const socketB = await connect(proToken);
  const socketA = await connect(clientAToken);
  await ackEmit(socketB, 'conversation:join', { conversationId });
  await ackEmit(socketA, 'conversation:join', { conversationId });

  const body = `mensagem socket ${ts}`;
  const received = waitFor<{ id: string; body: string; senderId: string }>(
    socketB,
    'message:new',
  );
  const ack = await ackEmit<{ id: string }>(socketA, 'message:send', {
    conversationId,
    body,
  });
  expect(ack.error).toBeFalsy();
  expect(ack.data?.id).toBeTruthy();

  const message = await received;
  expect(message.id).toBe(ack.data?.id);
  expect(message.body).toBe(body);
  expect(message.senderId).toBe(clientAId);

  const { rows } = await pool.query(
    'select count(*)::int as n from messages where conversation_id = $1 and body = $2',
    [conversationId, body],
  );
  expect(rows[0].n).toBe(1);

  socketA.disconnect();
  socketB.disconnect();
});

it('não-participante recebe erro no join e no message:send', async () => {
  const socketC = await connect(attackerToken);

  const join = await ackEmit(socketC, 'conversation:join', {
    conversationId,
  });
  expect(join.error).toBeTruthy();

  const send = await ackEmit(socketC, 'message:send', {
    conversationId,
    body: 'invasão via socket',
  });
  expect(send.error).toBeTruthy();

  const { rows } = await pool.query(
    'select count(*)::int as n from messages where conversation_id = $1 and body = $2',
    [conversationId, 'invasão via socket'],
  );
  expect(rows[0].n).toBe(0);

  socketC.disconnect();
});

it('typing chega ao par como typing:state', async () => {
  const socketB = await connect(proToken);
  const socketA = await connect(clientAToken);
  await ackEmit(socketB, 'conversation:join', { conversationId });
  await ackEmit(socketA, 'conversation:join', { conversationId });

  const typing = waitFor<{ conversationId: string; isTyping: boolean }>(
    socketB,
    'typing:state',
  );
  socketA.emit('typing', { conversationId, isTyping: true });

  const state = await typing;
  expect(state.conversationId).toBe(conversationId);
  expect(state.isTyping).toBe(true);

  socketA.disconnect();
  socketB.disconnect();
});

it('par offline recebe notification row ao chegar mensagem', async () => {
  const socketB = await connect(proToken);
  const socketA = await connect(clientAToken);
  await ackEmit(socketA, 'conversation:join', { conversationId });

  const bDisconnected = new Promise<void>((resolve) => {
    socketB.once('disconnect', () => resolve());
  });
  socketB.disconnect();
  await bDisconnected;

  const body = `mensagem para offline ${ts}`;
  const ack = await ackEmit(socketA, 'message:send', {
    conversationId,
    body,
  });
  expect(ack.error).toBeFalsy();

  const { rows } = await pool.query(
    "select count(*)::int as n from notifications where user_id = $1 and kind = 'message'",
    [proId],
  );
  expect(rows[0].n).toBeGreaterThanOrEqual(1);

  socketA.disconnect();
});
