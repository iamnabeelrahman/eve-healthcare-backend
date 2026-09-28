import Redis from 'ioredis';
import { env } from './env';
import { logger } from './logger';

let client: Redis | null = null;
let isAvailable = true;

export function getRedis(): Redis | null {
  if (!client) {
    client = new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: 2,
      lazyConnect: false,
      enableOfflineQueue: false,
    });

    client.on('error', (err) => {
      if (isAvailable) {
        logger.warn({ err: err.message }, 'Redis connection error — falling back to DB');
        isAvailable = false;
      }
    });

    client.on('ready', () => {
      if (!isAvailable) logger.info('Redis reconnected');
      isAvailable = true;
    });
  }
  return client;
}

export function redisIsAvailable(): boolean {
  return isAvailable && client !== null && client.status === 'ready';
}

export async function closeRedis(): Promise<void> {
  if (client) {
    await client.quit();
    client = null;
  }
}
