import { and, count, desc, eq, inArray, isNull } from 'drizzle-orm';
import { db, type Database } from '../db/client.js';
import { notifications } from '../db/schema.js';

export async function notify(
  database: Database,
  userId: string,
  kind: string,
  body: string,
) {
  const [created] = await database
    .insert(notifications)
    .values({ userId, kind, body })
    .returning();
  return created;
}

export async function listNotifications(userId: string) {
  const data = await db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(100);

  const [unread] = await db
    .select({ n: count() })
    .from(notifications)
    .where(
      and(
        eq(notifications.userId, userId),
        isNull(notifications.readAt),
      ),
    );

  return { data, meta: { unread: Number(unread?.n ?? 0) } };
}

export async function markRead(
  userId: string,
  ids?: string[],
): Promise<{ updated: number }> {
  const conditions = [
    eq(notifications.userId, userId),
    isNull(notifications.readAt),
  ];
  if (ids && ids.length > 0) {
    conditions.push(inArray(notifications.id, ids));
  }

  const updated = await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(and(...conditions))
    .returning({ id: notifications.id });

  return { updated: updated.length };
}
