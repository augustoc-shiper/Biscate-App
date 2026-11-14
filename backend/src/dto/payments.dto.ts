import { z } from 'zod';

export const CreatePaymentDto = z.object({
  planId: z.number().int().positive(),
});

export type CreatePaymentInput = z.infer<typeof CreatePaymentDto>;
