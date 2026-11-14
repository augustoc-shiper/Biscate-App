import { z } from 'zod';

export const CreateReviewDto = z.object({
  conversationId: z.string().min(1),
  stars: z.number().int().min(1).max(5),
  comment: z.string().max(1000).optional(),
});

export type CreateReviewInput = z.infer<typeof CreateReviewDto>;
