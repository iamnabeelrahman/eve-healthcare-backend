import { cacheService, CacheKeys } from '../../src/services/cache.service';
import { redisIsAvailable } from '../../src/config/redis';

describe('cacheService', () => {
  beforeAll(() => {
    if (!redisIsAvailable()) {
      // eslint-disable-next-line no-console
      console.warn('Redis not available — cache tests will be skipped');
    }
  });

  it('returns null on cache miss', async () => {
    if (!redisIsAvailable()) return;
    const v = await cacheService.get('does:not:exist');
    expect(v).toBeNull();
  });

  it('stores and retrieves values', async () => {
    if (!redisIsAvailable()) return;
    await cacheService.set('test:key', { a: 1 }, 10);
    const v = await cacheService.get<{ a: number }>('test:key');
    expect(v).toEqual({ a: 1 });
  });

  it('invalidates keys', async () => {
    if (!redisIsAvailable()) return;
    await cacheService.set('test:key2', { a: 2 }, 10);
    await cacheService.invalidate(['test:key2']);
    expect(await cacheService.get('test:key2')).toBeNull();
  });

  it('exposes correct cache key helpers', () => {
    expect(CacheKeys.centre('abc')).toBe('centre:abc');
    expect(CacheKeys.centreTests('abc')).toBe('centre:abc:tests');
  });
});
