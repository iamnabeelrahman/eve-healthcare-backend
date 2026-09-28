import request from 'supertest';
import { Express } from 'express';
import { createApp } from '../../src/app';
import { prisma } from '../../src/lib/prisma';
import { resetDb, makeAdmin, signupAndLogin } from '../helpers';

let app: Express;

beforeAll(() => {
  app = createApp();
});
beforeEach(async () => {
  await resetDb();
});
afterAll(async () => {
  await prisma.$disconnect();
});

describe('Centres', () => {
  it('lists centres with pagination', async () => {
    const res = await request(app).get('/api/v1/centres?page=1&limit=10');
    expect(res.status).toBe(200);
    expect(res.body.pagination.page).toBe(1);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('admin can create a centre', async () => {
    const token = await makeAdmin();
    const res = await request(app)
      .post('/api/v1/centres')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Downtown', location: 'Mumbai' });
    expect(res.status).toBe(201);
    expect(res.body.data.name).toBe('Downtown');
  });

  it('normal user cannot create a centre', async () => {
    const token = await signupAndLogin(app);
    const res = await request(app)
      .post('/api/v1/centres')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Downtown', location: 'Mumbai' });
    expect(res.status).toBe(403);
  });

  it('returns 400 for invalid UUID', async () => {
    const res = await request(app).get('/api/v1/centres/not-a-uuid');
    expect(res.status).toBe(400);
  });

  it('returns 404 for missing centre', async () => {
    const res = await request(app).get('/api/v1/centres/00000000-0000-0000-0000-000000000000');
    expect(res.status).toBe(404);
  });
});
