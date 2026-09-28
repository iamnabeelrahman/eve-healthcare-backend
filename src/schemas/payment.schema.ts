import { z } from 'zod';
import { uuidParam } from './common.schema';

export const createPaymentSchema = z
  .object({
    bookingId: uuidParam,
  })
  .strict();

export const webhookSchema = z.object({
  eventId: z.string().min(1),
  eventType: z.string().min(1),
  paymentId: z.string().min(1),
  bookingId: uuidParam,
  status: z.enum(['SUCCESS', 'FAILED']),
});

export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;
export type WebhookInput = z.infer<typeof webhookSchema>;
