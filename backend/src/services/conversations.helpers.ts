import { db } from '../db/client.js';
import { conversations } from '../db/schema.js';

export async function ensureConversation(
  clientId: string,
  professionalId: string,
): Promise<{ id: string }> {
  const existing = await db.query.conversations.findFirst({
    where: (t, { and, eq }) =>
      and(eq(t.clientId, clientId), eq(t.professionalId, professionalId)),
  });
  if (existing) return { id: existing.id };

  const [created] = await db
    .insert(conversations)
    .values({ clientId, professionalId })
    .onConflictDoNothing({
      target: [conversations.clientId, conversations.professionalId],
    })
    .returning();

  if (created) return { id: created.id };

  const row = await db.query.conversations.findFirst({
    where: (t, { and, eq }) =>
      and(eq(t.clientId, clientId), eq(t.professionalId, professionalId)),
  });
  return { id: row!.id };
}
