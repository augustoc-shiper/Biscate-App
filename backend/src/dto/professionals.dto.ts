import { z } from 'zod';

export const ProfessionalQueryDto = z.object({
  category: z.string().optional(),
  bairro: z.string().optional(),
  q: z.string().optional(),
  sort: z.enum(['rating', 'distance', 'price']).default('rating'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export type ProfessionalQuery = z.infer<typeof ProfessionalQueryDto>;
