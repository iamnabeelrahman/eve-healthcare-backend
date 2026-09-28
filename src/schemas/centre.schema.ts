import { z } from 'zod';
import { uuidParam } from './common.schema';

export const createCentreSchema = z.object({
  name: z.string().min(2).max(150),
  location: z.string().min(2).max(200),
});

export const updateCentreSchema = createCentreSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided',
  });

export const updateCentreTestPriceSchema = z.object({
  price: z.coerce.number().positive().max(1_000_000),
});
export const centreIdParam = z.object({ id: uuidParam });

export const centreTestsParam = z.object({ centreId: uuidParam });

export const associateTestSchema = z.object({
  testId: uuidParam,
  price: z.coerce.number().positive().max(1_000_000),
});

export const updateCentreTestSchema = z.object({
  price: z.coerce.number().positive().max(1_000_000),
});

export const centreTestParam = z.object({
  centreId: uuidParam,
  testId: uuidParam,
});

export type CreateCentreInput = z.infer<typeof createCentreSchema>;
export type UpdateCentreInput = z.infer<typeof updateCentreSchema>;
export type AssociateTestInput = z.infer<typeof associateTestSchema>;
