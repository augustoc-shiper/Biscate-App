import { z } from 'zod';

export const ReadNotificationsDto = z.object({
  ids: z.array(z.string().min(1)).optional(),
});

export type ReadNotificationsInput = z.infer<typeof ReadNotificationsDto>;
