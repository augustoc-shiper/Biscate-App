import { z } from 'zod';

export const UpdateProfileDto = z.object({
  bio: z.string().max(500).nullable().optional(),
  priceText: z.string().max(120).nullable().optional(),
  categoryId: z.number().int().positive().nullable().optional(),
  bairroId: z.number().int().positive().nullable().optional(),
  availableToday: z.boolean().optional(),
  responseTime: z.string().max(120).nullable().optional(),
});

export type UpdateProfileInput = z.infer<typeof UpdateProfileDto>;
