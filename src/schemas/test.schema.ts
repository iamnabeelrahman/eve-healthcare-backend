import { z } from 'zod';
import { uuidParam } from './common.schema';

export const createTestSchema = z.object({
  name: z.string().min(2).max(150),
  description: z.string().max(500).optional(),
});

export const updateTestSchema = createTestSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided',
  });

export const testIdParam = z.object({ id: uuidParam });

export type CreateTestInput = z.infer<typeof createTestSchema>;
export type UpdateTestInput = z.infer<typeof updateTestSchema>;
