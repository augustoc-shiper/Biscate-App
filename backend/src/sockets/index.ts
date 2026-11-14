import type { Server as HttpServer } from 'node:http';
import { Server } from 'socket.io';
import { db } from '../db/client.js';
import { notifications } from '../db/schema.js';
import { SendMessageDto } from '../dto/conversations.dto.js';
import { AppError } from '../lib/AppError.js';
import { verifyToken, type JwtPayload } from '../lib/jwt.js';
import {
  assertParticipant,
  sendMessage,
} from '../services/conversations.service.js';

export type SocketData = { user: JwtPayload };

type ClientEvents = {
  'conversation:join': (
    payload: { conversationId?: string },
    ack?: (err: unknown) => void,
  ) => void;
  'message:send': (
    payload: {
      conversationId?: string;
      body?: string;
      kind?: string;
      payload?: Record<string, unknown>;
    },
    ack?: (err: unknown, message?: unknown) => void,
  ) => void;
  typing: (payload: { conversationId?: string; isTyping?: boolean }) => void;
};

type ServerEvents = {
  'message:new': (message: unknown) => void;
  'typing:state': (state: {
    conversationId: string;
    isTyping: boolean;
    userId: string;
  }) => void;
  presence: (state: { userId: string; online: boolean }) => void;
};

type AppServer = Server<
  ClientEvents,
  ServerEvents,
  Record<string, never>,
  SocketData
>;

function ackError(
  ack: ((err: unknown) => void) | undefined,
  err: unknown,
): void {
  if (typeof ack === 'function') ack(err);
}

function toAckPayload(err: unknown): { code: string; message: string } {
  if (err instanceof AppError) {
    return { code: err.code, message: err.message };
  }
  if (err && typeof err === 'object' && 'issues' in err) {
    return { code: 'VALIDATION_ERROR', message: 'Dados inválidos' };
  }
  return { code: 'INTERNAL_ERROR', message: 'Erro inesperado' };
}

export function createSocketServer(
  httpServer: HttpServer,
  opts: { corsOrigin: string },
) {
  const io: AppServer = new Server(httpServer, {
    cors: { origin: opts.corsOrigin, credentials: true },
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token) {
      next(new Error('UNAUTHORIZED'));
      return;
    }
    try {
      socket.data.user = verifyToken(token);
      next();
    } catch {
      next(new Error('UNAUTHORIZED'));
    }
  });

  io.on('connection', (socket) => {
    const user = socket.data.user;

    socket.on('conversation:join', async (payload, ack) => {
      try {
        const conversationId = payload?.conversationId;
        if (!conversationId) {
          throw new AppError(400, 'VALIDATION_ERROR', 'conversationId');
        }
        await assertParticipant(conversationId, user.id);
        socket.join(`conversation:${conversationId}`);
        socket
          .to(`conversation:${conversationId}`)
          .emit('presence', { userId: user.id, online: true });
        ackError(ack, null);
      } catch (err) {
        ackError(ack, toAckPayload(err));
      }
    });

    socket.on('message:send', async (payload, ack) => {
      try {
        const conversationId = payload?.conversationId;
        if (!conversationId) {
          throw new AppError(400, 'VALIDATION_ERROR', 'conversationId');
        }
        const input = SendMessageDto.parse({
          body: payload?.body,
          kind: payload?.kind ?? 'text',
          payload: payload?.payload,
        });

        const conversation = await assertParticipant(conversationId, user.id);
        const message = await sendMessage(conversationId, user.id, input);

        const room = `conversation:${conversationId}`;
        io.to(room).emit('message:new', message);
        if (typeof ack === 'function') ack(null, message);

        const peerId =
          conversation.clientId === user.id
            ? conversation.professionalId
            : conversation.clientId;
        const roomSockets = await io.in(room).fetchSockets();
        const peerOnline = roomSockets.some(
          (s) => s.data.user?.id === peerId,
        );
        if (!peerOnline) {
          await db.insert(notifications).values({
            userId: peerId,
            kind: 'message',
            body: (message.body ?? '').slice(0, 200),
          });
        }
      } catch (err) {
        if (typeof ack === 'function') ack(toAckPayload(err));
      }
    });

    socket.on('typing', async (payload) => {
      try {
        const conversationId = payload?.conversationId;
        if (!conversationId || typeof payload?.isTyping !== 'boolean') return;
        await assertParticipant(conversationId, user.id);
        socket.to(`conversation:${conversationId}`).emit('typing:state', {
          conversationId,
          isTyping: payload.isTyping,
          userId: user.id,
        });
      } catch {
        // sem ack: ignorar silenciosamente (não-participante ou inválido)
      }
    });

    socket.on('disconnect', () => {
      for (const room of socket.rooms) {
        if (room.startsWith('conversation:')) {
          io.to(room).emit('presence', { userId: user.id, online: false });
        }
      }
    });
  });

  return io;
}
