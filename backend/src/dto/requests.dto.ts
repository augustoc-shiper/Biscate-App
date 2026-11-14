import { z } from 'zod';

export const CreateRequestDto = z.object({
  categoryId: z.number().int().positive(),
  description: z.string().min(10, 'Descreva o trabalho com mais detalhe'),
  bairroId: z.number().int().positive(),
  when: z.enum(['today', 'week', 'flexible']),
});

export const CreateOfferDto = z.object({
  price: z.number().int().positive(),
  message: z.string().min(5, 'Mensagem demasiado curta'),
});

export type CreateRequestInput = z.infer<typeof CreateRequestDto>;
export type CreateOfferInput = z.infer<typeof CreateOfferDto>;
