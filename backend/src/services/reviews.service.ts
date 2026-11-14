import { eq, sql } from 'drizzle-orm';
import { db } from '../db/client.js';
import {
  conversations,
  messages,
  professionalProfiles,
  reviews,
} from '../db/schema.js';
import type { CreateReviewInput } from '../dto/reviews.dto.js';
import { AppError } from '../lib/AppError.js';

export async function createReview(
  reviewerId: string,
  input: CreateReviewInput,
) {
  try {
    return await db.transaction(async (tx) => {
      const conversation = await tx.query.conversations.findFirst({
        where: eq(conversations.id, input.conversationId),
      });
      if (!conversation) {
        throw new AppError(404, 'NOT_FOUND', 'Conversa não encontrada');
      }
      if (
        conversation.clientId !== reviewerId ||
        conversation.professionalId === reviewerId
      ) {
        throw new AppError(
          403,
          'FORBIDDEN',
          'Só o cliente da conversa pode avaliar',
        );
      }

      const existing = await tx.query.reviews.findFirst({
        where: (t, { and, eq }) =>
          and(
            eq(t.conversationId, input.conversationId),
            eq(t.reviewerId, reviewerId),
          ),
      });
      if (existing) {
        throw new AppError(
          409,
          'REVIEW_EXISTS',
          'Já avaliou este profissional nesta conversa',
        );
      }

      const reviewedId = conversation.professionalId;

      const [review] = await tx
        .insert(reviews)
        .values({
          conversationId: input.conversationId,
          reviewerId,
          reviewedId,
          stars: input.stars,
          comment: input.comment ?? null,
        })
        .returning();

      await tx.insert(messages).values({
        conversationId: input.conversationId,
        senderId: reviewerId,
        kind: 'rating',
        body: input.comment ?? null,
        payload: { stars: input.stars },
      });

      const [agg] = await tx
        .select({
          avg: sql<string>`coalesce(avg(${reviews.stars}), 0)`,
          n: sql<number>`count(*)::int`,
        })
        .from(reviews)
        .where(eq(reviews.reviewedId, reviewedId));

      await tx
        .update(professionalProfiles)
        .set({
          ratingAvg: Number(agg?.avg ?? 0),
          ratingCount: Number(agg?.n ?? 0),
        })
        .where(eq(professionalProfiles.userId, reviewedId));

      return review;
    });
  } catch (err) {
    if (
      err instanceof Error &&
      'code' in err &&
      (err as { code?: string }).code === '23505'
    ) {
      throw new AppError(
        409,
        'REVIEW_EXISTS',
        'Já avaliou este profissional nesta conversa',
      );
    }
    throw err;
  }
}
