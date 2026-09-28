import { getRedis, redisIsAvailable } from '../config/redis';
import { logger } from '../config/logger';

const DEFAULT_TTL_SECONDS = 60;

export const cacheService = {
  async get<T>(key: string): Promise<T | null> {
    if (!redisIsAvailable()) return null;
    try {
      const client = getRedis();
      if (!client) return null;
      const raw = await client.get(key);
      if (!raw) return null;
      return JSON.parse(raw) as T;
    } catch (err) {
      logger.warn({ err: (err as Error).message, key }, 'Cache get failed');
      return null;
    }
  },

  async set(key: string, value: unknown, ttlSeconds = DEFAULT_TTL_SECONDS): Promise<void> {
    if (!redisIsAvailable()) return;
    try {
      const client = getRedis();
      if (!client) return;
      await client.set(key, JSON.stringify(value), 'EX', ttlSeconds);
    } catch (err) {
      logger.warn({ err: (err as Error).message, key }, 'Cache set failed');
    }
  },

  /**
   * Delete a list of keys. Uses SCAN when a pattern is given to avoid blocking
   * the Redis server with KEYS.
   */
  async invalidate(keys: string[]): Promise<void> {
    if (!redisIsAvailable() || keys.length === 0) return;
    try {
      const client = getRedis();
      if (!client) return;
      await client.del(...keys);
    } catch (err) {
      logger.warn({ err: (err as Error).message, keys }, 'Cache invalidate failed');
    }
  },

  async invalidatePattern(pattern: string): Promise<void> {
    if (!redisIsAvailable()) return;
    try {
      const client = getRedis();
      if (!client) return;
      const stream = client.scanStream({ match: pattern, count: 100 });
      const pipeline = client.pipeline();
      let queued = 0;
      for await (const keys of stream as AsyncIterable<string[]>) {
        if (keys.length) {
          pipeline.del(...keys);
          queued += keys.length;
        }
      }
      if (queued > 0) await pipeline.exec();
    } catch (err) {
      logger.warn({ err: (err as Error).message, pattern }, 'Cache pattern invalidate failed');
    }
  },
};

export const CacheKeys = {
  centresList: (page: number, limit: number) => `centres:list:${page}:${limit}`,
  centresListPattern: () => `centres:list:*`,
  centre: (id: string) => `centre:${id}`,
  centreTests: (centreId: string) => `centre:${centreId}:tests`,
  testsList: (page: number, limit: number) => `tests:list:${page}:${limit}`,
  testsListPattern: () => `tests:list:*`,
  test: (id: string) => `test:${id}`,
};