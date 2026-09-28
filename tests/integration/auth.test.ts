import request from 'supertest';
import { Express } from 'express';
import { createApp } from '../../src/app';
import { prisma } from '../../src/lib/prisma';
import { resetDb } from '../helpers';

let app: Express;

beforeAll(async () => {
  app = createApp();
});

beforeEach(async () => {
  await resetDb();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('Auth', () => {
  it('signs up a user', async () => {
    const res = await request(app)
      .post('/api/v1/auth/signup')
      .send({ name: 'John', email: 'john@example.com', password: 'SecurePassword123' });
    expect(res.status).toBe(201);
    expect(res.body.data.email).toBe('john@example.com');
    expect(res.body.data.passwordHash).toBeUndefined();
  });

  it('rejects duplicate email', async () => {
    await request(app)
      .post('/api/v1/auth/signup')
      .send({ name: 'John', email: 'john@example.com', password: 'SecurePassword123' });
    const res = await request(app)
      .post('/api/v1/auth/signup')
      .send({ name: 'John2', email: 'john@example.com', password: 'SecurePassword123' });
    expect(res.status).toBe(409);
  });

  it('rejects weak passwords', async () => {
    const res = await request(app)
      .post('/api/v1/auth/signup')
      .send({ name: 'John', email: 'john@example.com', password: 'weak' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('logs in and returns token', async () => {
    await request(app)
      .post('/api/v1/auth/signup')
      .send({ name: 'John', email: 'john@example.com', password: 'SecurePassword123' });
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'john@example.com', password: 'SecurePassword123' });
    expect(res.status).toBe(200);
    expect(typeof res.body.data.token).toBe('string');
  });

  it('rejects invalid login', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'nobody@example.com', password: 'anything123' });
    expect(res.status).toBe(401);
  });

  it('rejects missing JWT', async () => {
    const res = await request(app).get('/api/v1/auth/me');
    expect(res.status).toBe(401);
  });

  it('rejects invalid JWT', async () => {
    const res = await request(app).get('/api/v1/auth/me').set('Authorization', 'Bearer nope');
    expect(res.status).toBe(401);
  });
});
