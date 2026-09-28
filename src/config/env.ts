import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1).default('redis://localhost:6379'),
  JWT_SECRET: z.string().min(16),
  JWT_EXPIRATION: z.string().default('1d'),
  WEBHOOK_SECRET: z.string().min(1),
  LOG_LEVEL: z.string().default('info'),
  AUTH_RATE_LIMIT_MAX: z.coerce.number().default(10),
  AUTH_RATE_LIMIT_WINDOW_MS: z.coerce.number().default(60_000),
  WEBHOOK_RATE_LIMIT_MAX: z.coerce.number().default(100),
  WEBHOOK_RATE_LIMIT_WINDOW_MS: z.coerce.number().default(60_000),
  PAYMENT_SIMULATION_MODE: z.enum(['random', 'success', 'failure']).default('random'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  // eslint-disable-next-line no-console
  console.error('Invalid environment variables:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;