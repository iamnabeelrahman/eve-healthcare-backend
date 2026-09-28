import rateLimit from 'express-rate-limit';
import { env } from '../config/env';
import { redisIsAvailable, getRedis } from '../config/redis';
import RedisStore from 'rate-limit-redis';
import { Request } from 'express';

function makeStore(prefix: string) {
  if (!redisIsAvailable()) return undefined;
  const client = getRedis();
  if (!client) return undefined;
  return new RedisStore({
    sendCommand: (...args: string[]) => client.call(...(args as [string, ...string[]])) as Promise<never>,
    prefix,
  });
}

export const authLimiter = rateLimit({
  windowMs: env.AUTH_RATE_LIMIT_WINDOW_MS,
  max: env.AUTH_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  store: makeStore('rl:auth:'),
  keyGenerator: (req: Request) => req.ip ?? 'unknown',
  message: {
    success: false,
    error: { code: 'RATE_LIMITED', message: 'Too many requests. Please try again later.' },
  },
});

export const webhookLimiter = rateLimit({
  windowMs: env.WEBHOOK_RATE_LIMIT_WINDOW_MS,
  max: env.WEBHOOK_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  store: makeStore('rl:webhook:'),
  keyGenerator: (req: Request) => req.ip ?? 'unknown',
  message: {
    success: false,
    error: { code: 'RATE_LIMITED', message: 'Too many webhook requests.' },
  },
});