import { Prisma } from '@prisma/client';
import { webhookEventRepository } from '../repositories/webhookEvent.repository';
import { AppError } from '../utils/AppError';
import { logger } from '../config/logger';
import { WebhookInput } from '../schemas/payment.schema';
import { enqueueWebhookJob } from '../queues/webhook.queue';
import { env } from '../config/env';
import { paymentService } from './payment.service';

export interface WebhookResult {
  received: boolean;
  duplicate: boolean;
  queued: boolean;
}

export const webhookService = {
  /**
   * Handle an incoming webhook.
   *
   * Idempotency strategy:
   *  1. Attempt to INSERT a WebhookEvent row with a UNIQUE eventId.
   *  2. If the insert succeeds, this is the first time we've seen the event —
   *     queue it for processing.
   *  3. If the insert fails with P2002 (unique violation), the event was
   *     already received. Return 200 idempotent success without side effects.
   *
   * This works under concurrency because PostgreSQL enforces the UNIQUE
   * constraint at the DB level, so only one writer can win.
   *
   * When Redis/BullMQ is unavailable (or in test mode with
   * WEBHOOK_ASYNC=false), we fall back to processing synchronously. The DB
   * uniqueness check still protects us from duplicates.
   */
  async handle(input: WebhookInput): Promise<WebhookResult> {
    const payload = input as unknown as Prisma.InputJsonValue;

    const creation = await webhookEventRepository.tryCreate({
      eventId: input.eventId,
      eventType: input.eventType,
      payload,
    });

    if (!creation.created) {
      logger.info({ eventId: input.eventId }, 'Duplicate webhook event ignored');
      return { received: true, duplicate: true, queued: false };
    }

    // First time seen. Either enqueue or process synchronously.
    const useQueue = env.NODE_ENV !== 'test';
    let queued = false;
    if (useQueue) {
      try {
        await enqueueWebhookJob({ eventId: input.eventId, payload: input });
        queued = true;
      } catch (err) {
        logger.warn(
          { err: (err as Error).message, eventId: input.eventId },
          'Failed to enqueue webhook; processing synchronously',
        );
      }
    }

    if (!queued) {
      await this.processPayload(input);
      await webhookEventRepository.markProcessed(creation.event.id);
    }

    return { received: true, duplicate: false, queued };
  },

  /**
   * Process the payload. Idempotent because Payment row is looked up by
   * providerPaymentId (unique) and booking status transitions are guarded.
   */
  async processPayload(input: WebhookInput): Promise<void> {
    try {
      await paymentService.applyProviderStatus({
        bookingId: input.bookingId,
        providerPaymentId: input.paymentId,
        status: input.status,
      });
    } catch (err) {
      if (err instanceof AppError && err.statusCode === 404) {
        // Unknown booking — record and rethrow for the worker to mark as
        // permanent failure. We do not retry business errors.
        logger.warn(
          { eventId: input.eventId, bookingId: input.bookingId },
          'Webhook references unknown booking',
        );
      }
      throw err;
    }
  },

  async markProcessedByEventId(eventId: string): Promise<void> {
    const event = await webhookEventRepository.findByEventId(eventId);
    if (event && !event.processedAt) {
      await webhookEventRepository.markProcessed(event.id);
    }
  },
};