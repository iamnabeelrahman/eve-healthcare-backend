import request from 'supertest';
import { Express } from 'express';
import { createApp } from '../../src/app';
import { prisma } from '../../src/lib/prisma';
import { resetDb, makeAdmin } from '../helpers';

let app: Express;
let adminToken: string;

beforeAll(() => {
  app = createApp();
});
beforeEach(async () => {
  await resetDb();
  adminToken = await makeAdmin();
});
afterAll(async () => {
  await prisma.$disconnect();
});

describe('Diagnostic Tests', () => {
  it('admin creates a test', async () => {
    const res = await request(app)
      .post('/api/v1/tests')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'CBC', description: 'Complete blood count' });
    expect(res.status).toBe(201);
  });

  it('associates test with centre and returns centre price', async () => {
    const centre = await request(app)
      .post('/api/v1/centres')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'C1', location: 'L1' });

    const test = await request(app)
      .post('/api/v1/tests')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'T1' });

    const assoc = await request(app)
      .post(`/api/v1/centres/${centre.body.data.id}/tests`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ testId: test.body.data.id, price: 1500 });
    expect(assoc.status).toBe(201);

    const list = await request(app).get(`/api/v1/centres/${centre.body.data.id}/tests`);
    expect(list.status).toBe(200);
    expect(list.body.data[0].price).toBe('1500');
  });

  it('rejects duplicate centre/test association', async () => {
    const centre = await prisma.diagnosticCentre.create({ data: { name: 'C', location: 'L' } });
    const test = await prisma.diagnosticTest.create({ data: { name: 'T' } });
    await request(app)
      .post(`/api/v1/centres/${centre.id}/tests`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ testId: test.id, price: 1000 });
    const res = await request(app)
      .post(`/api/v1/centres/${centre.id}/tests`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ testId: test.id, price: 1200 });
    expect(res.status).toBe(409);
  });
});
