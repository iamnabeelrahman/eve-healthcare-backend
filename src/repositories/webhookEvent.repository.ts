import { Prisma, WebhookEvent } from '@prisma/client';
import { prisma } from '../lib/prisma';

export const webhookEventRepository = {
  findByEventId(eventId: string): Promise<WebhookEvent | null> {
    return prisma.webhookEvent.findUnique({ where: { eventId } });
  },
  /**
   * Attempt to create the webhook event. The UNIQUE constraint on eventId is
   * the authoritative idempotency guard. If two concurrent requests race,
   * exactly one insert succeeds and the other throws P2002.
   */
  async tryCreate(data: {
    eventId: string;
    eventType: string;
    payload: Prisma.InputJsonValue;
  }): Promise<{ created: true; event: WebhookEvent } | { created: false }> {
    try {
      const event = await prisma.webhookEvent.create({ data });
      return { created: true, event };
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        return { created: false };
      }
      throw err;
    }
  },
  markProcessed(id: string): Promise<WebhookEvent> {
    return prisma.webhookEvent.update({
      where: { id },
      data: { processedAt: new Date() },
    });
  },
};