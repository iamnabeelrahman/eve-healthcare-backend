process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'test-secret-please-change-please';
process.env.WEBHOOK_SECRET = process.env.WEBHOOK_SECRET ?? 'test-webhook-secret';
process.env.PAYMENT_SIMULATION_MODE = 'success';
process.env.DATABASE_URL =
  process.env.DATABASE_URL ?? 'postgresql://eve:eve_password@localhost:5432/eve_healthcare_test';
process.env.REDIS_URL = process.env.REDIS_URL ?? 'redis://localhost:6379';
