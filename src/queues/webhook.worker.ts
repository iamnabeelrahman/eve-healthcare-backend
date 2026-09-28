import { Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import { env } from '../config/env';
import { logger } from '../config/logger';
import { WEBHOOK_QUEUE_NAME } from './webhook.queue';
import { webhookService } from '../services/webhook.service';
import { WebhookInput } from '../schemas/payment.schema';
import { AppError } from '../utils/AppError';
import { disconnectPrisma } from '../lib/prisma';

interface JobData {
  eventId: string;
  payload: WebhookInput;
}

async function processJob(job: Job<JobData>): Promise<void> {
  const { eventId, payload } = job.data;
  logger.info({ eventId, attempt: job.attemptsMade + 1 }, 'Processing webhook job');

  await webhookService.processPayload(payload);
  await webhookService.markProcessedByEventId(eventId);

  logger.info({ eventId }, 'Webhook job processed');
}

export function startWorker(): Worker<JobData> {
  const connection = new IORedis(env.REDIS_URL, { maxRetriesPerRequest: null });

  const worker = new Worker<JobData>(WEBHOOK_QUEUE_NAME, processJob, {
    connection,
    concurrency: 5,
  });

  worker.on('failed', (job, err) => {
    const isPermanent =
      err instanceof AppError && err.statusCode >= 400 && err.statusCode < 500;
    logger.error(
      {
        jobId: job?.id,
        eventId: job?.data.eventId,
        attempt: job?.attemptsMade,
        permanent: isPermanent,
        err: err.message,
      },
      'Webhook job failed',
    );

    // BullMQ will retry based on attempts/backoff. Permanent 4xx errors
    // (e.g. unknown booking) will exhaust retries quickly, then the job
    // remains in the failed set for inspection.
  });

  worker.on('error', (err) => logger.error({ err: err.message }, 'Worker error'));

  return worker;
}

if (require.main === module) {
  const worker = startWorker();
  logger.info('Webhook worker started');

  const shutdown = async (signal: string) => {
    logger.info({ signal }, 'Shutting down worker');
    await worker.close();
    await disconnectPrisma();
    process.exit(0);
  };
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
}