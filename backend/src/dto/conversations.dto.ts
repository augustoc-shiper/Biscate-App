import { z } from 'zod';

export const CreateConversationDto = z.object({
  professionalId: z.string().min(1),
});

export const SendMessageDto = z.object({
  body: z.string().min(1, 'Mensagem vazia').max(4000),
  kind: z.enum(['text', 'image', 'quote', 'rating']).default('text'),
  payload: z.record(z.string(), z.unknown()).optional(),
});

export type CreateConversationInput = z.infer<typeof CreateConversationDto>;
export type SendMessageInput = z.infer<typeof SendMessageDto>;
