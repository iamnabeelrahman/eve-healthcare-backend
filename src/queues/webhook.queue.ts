import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { env } from '../config/env';
import { logger } from '../config/logger';
import { WebhookInput } from '../schemas/payment.schema';

export const WEBHOOK_QUEUE_NAME = 'webhook-processing';

let connection: IORedis | null = null;
let queue: Queue<{ eventId: string; payload: WebhookInput }> | null = null;

function getConnection(): IORedis {
  if (!connection) {
    connection = new IORedis(env.REDIS_URL, { maxRetriesPerRequest: null });
  }
  return connection;
}

export function getWebhookQueue(): Queue<{ eventId: string; payload: WebhookInput }> {
  if (!queue) {
    queue = new Queue(WEBHOOK_QUEUE_NAME, {
      connection: getConnection(),
      defaultJobOptions: {
        attempts: 5,
        backoff: { type: 'exponential', delay: 1_000 },
        removeOnComplete: { age: 3600, count: 1000 },
        removeOnFail: false,
      },
    });
    queue.on('error', (err) => logger.warn({ err: err.message }, 'Webhook queue error'));
  }
  return queue;
}

export async function enqueueWebhookJob(data: { eventId: string; payload: WebhookInput }): Promise<void> {
  const q = getWebhookQueue();
  await q.add('process', data, { jobId: data.eventId });
}

export async function closeWebhookQueue(): Promise<void> {
  if (queue) {
    await queue.close();
    queue = null;
  }
  if (connection) {
    await connection.quit();
    connection = null;
  }
}