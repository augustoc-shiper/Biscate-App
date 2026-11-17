import { and, count, desc, eq, ne, or, sql } from 'drizzle-orm';
import { db } from '../db/client.js';
import {
  conversations,
  messages,
  users,
} from '../db/schema.js';
import type { SendMessageInput } from '../dto/conversations.dto.js';
import { systemClock } from '../lib/clock.js';
import { AppError } from '../lib/AppError.js';
import { ensureConversation } from './conversations.helpers.js';
import { activateByMessage, type Tx } from './subscriptions.service.js';

export async function assertParticipant(
  conversationId: string,
  userId: string,
  tx?: Tx,
): Promise<(typeof conversations.$inferSelect)> {
  const executor = tx ?? db;
  const conversation = await executor.query.conversations.findFirst({
    where: eq(conversations.id, conversationId),
  });
  if (!conversation) {
    throw new AppError(404, 'NOT_FOUND', 'Conversa não encontrada');
  }
  if (conversation.clientId !== userId && conversation.professionalId !== userId) {
    throw new AppError(403, 'FORBIDDEN', 'Sem acesso a esta conversa');
  }
  return conversation;
}

export async function createConversation(
  clientId: string,
  professionalId: string,
): Promise<{ id: string; created: boolean }> {
  const target = await db.query.users.findFirst({
    where: (t, { and, eq }) =>
      and(eq(t.id, professionalId), eq(t.role, 'professional')),
  });
  if (!target) {
    throw new AppError(404, 'NOT_FOUND', 'Profissional não encontrado');
  }

  const existing = await db.query.conversations.findFirst({
    where: (t, { and, eq }) =>
      and(eq(t.clientId, clientId), eq(t.professionalId, professionalId)),
  });
  if (existing) return { id: existing.id, created: false };

  const { id } = await ensureConversation(clientId, professionalId);
  return { id, created: true };
}

export async function listConversations(userId: string) {
  const rows = await db
    .select()
    .from(conversations)
    .where(
      or(
        eq(conversations.clientId, userId),
        eq(conversations.professionalId, userId),
      ),
    )
    .orderBy(desc(conversations.lastMessageAt));

  const result = [];
  for (const conversation of rows) {
    const peerId =
      conversation.clientId === userId
        ? conversation.professionalId
        : conversation.clientId;
    const [peer] = await db
      .select({
        id: users.id,
        name: users.name,
        avatarUrl: users.avatarUrl,
        verified: users.verified,
      })
      .from(users)
      .where(eq(users.id, peerId))
      .limit(1);

    const [last] = await db
      .select({
        body: messages.body,
        kind: messages.kind,
        createdAt: messages.createdAt,
      })
      .from(messages)
      .where(eq(messages.conversationId, conversation.id))
      .orderBy(desc(messages.createdAt))
      .limit(1);

    const [unread] = await db
      .select({ n: count() })
      .from(messages)
      .where(
        and(
          eq(messages.conversationId, conversation.id),
          ne(messages.senderId, userId),
          sql`${messages.readAt} is null`,
        ),
      );

    result.push({
      id: conversation.id,
      peer,
      lastMessage: last ?? null,
      unreadCount: unread?.n ?? 0,
      lastMessageAt: conversation.lastMessageAt,
    });
  }
  return result;
}

export async function listMessages(
  conversationId: string,
  userId: string,
): Promise<{ data: unknown[]; meta: { total: number } }> {
  await assertParticipant(conversationId, userId);

  await db
    .update(messages)
    .set({ readAt: new Date() })
    .where(
      and(
        eq(messages.conversationId, conversationId),
        ne(messages.senderId, userId),
        sql`${messages.readAt} is null`,
      ),
    );

  const rows = await db
    .select({
      id: messages.id,
      body: messages.body,
      kind: messages.kind,
      payload: messages.payload,
      senderId: messages.senderId,
      senderName: users.name,
      createdAt: messages.createdAt,
    })
    .from(messages)
    .innerJoin(users, eq(messages.senderId, users.id))
    .where(eq(messages.conversationId, conversationId))
    .orderBy(messages.createdAt)
    .limit(200);

  const [total] = await db
    .select({ n: count() })
    .from(messages)
    .where(eq(messages.conversationId, conversationId));

  return { data: rows, meta: { total: total?.n ?? 0 } };
}

/**
 * A mensagem e a eventual activação partilham a mesma transacção: se a lock de
 * activação falhar (LOCK_BUSY), nada fica gravado e uma nova tentativa insere
 * exactamente uma mensagem. A assinatura pública é mantida para REST e socket.
 */
export async function sendMessage(
  conversationId: string,
  senderId: string,
  input: SendMessageInput,
  now: Date = systemClock(),
) {
  return db.transaction(async (tx) => {
    const conversation = await assertParticipant(conversationId, senderId, tx);

    const [created] = await tx
      .insert(messages)
      .values({
        conversationId,
        senderId,
        body: input.body,
        kind: input.kind,
        payload: input.payload ?? null,
        createdAt: now,
      })
      .returning();

    await tx
      .update(conversations)
      .set({ lastMessageAt: now })
      .where(eq(conversations.id, conversationId));

    // Só o cliente pode activar, com mensagem de texto posterior à aprovação.
    if (conversation.clientId === senderId) {
      await activateByMessage(
        {
          conversationId,
          clientId: senderId,
          professionalId: conversation.professionalId,
          kind: input.kind,
          body: input.body,
          createdAt: now,
        },
        now,
        tx,
      );
    }

    return created;
  });
}

// re-exported for Task 8 (requests accept) and Task 10 (socket)
export { ensureConversation } from './conversations.helpers.js';
