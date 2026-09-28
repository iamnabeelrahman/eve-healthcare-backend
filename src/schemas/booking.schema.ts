import { z } from 'zod';
import { uuidParam } from './common.schema';

export const createBookingSchema = z
  .object({
    centreTestId: uuidParam,
    appointmentDateTime: z.string().datetime({ offset: true }),
  })
  .strict();

export const bookingIdParam = z.object({ id: uuidParam });

export type CreateBookingInput = z.infer<typeof createBookingSchema>;