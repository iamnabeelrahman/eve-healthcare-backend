import request from 'supertest';
import { Express } from 'express';
import { createApp } from '../../src/app';
import { prisma } from '../../src/lib/prisma';
import { resetDb, makeAdmin, signupAndLogin } from '../helpers';

let app: Express;
let userToken: string;
let otherUserToken: string;
let centreTestId: string;
let priceValue: number;

beforeAll(() => {
  app = createApp();
});

beforeEach(async () => {
  await resetDb();
  userToken = await signupAndLogin(app, 'u1@example.com');
  otherUserToken = await signupAndLogin(app, 'u2@example.com');
  const admin = await makeAdmin();

  const centre = await request(app)
    .post('/api/v1/centres')
    .set('Authorization', `Bearer ${admin}`)
    .send({ name: 'C1', location: 'L1' });
  const test = await request(app)
    .post('/api/v1/tests')
    .set('Authorization', `Bearer ${admin}`)
    .send({ name: 'T1' });
  const assoc = await request(app)
    .post(`/api/v1/centres/${centre.body.data.id}/tests`)
    .set('Authorization', `Bearer ${admin}`)
    .send({ testId: test.body.data.id, price: 1234 });
  centreTestId = assoc.body.data.id;
  priceValue = 1234;
});

afterAll(async () => {
  await prisma.$disconnect();
});

const future = () => new Date(Date.now() + 86_400_000).toISOString();

describe('Bookings', () => {
  it('creates a booking with correct price snapshot', async () => {
    const res = await request(app)
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ centreTestId, appointmentDateTime: future() });
    expect(res.status).toBe(201);
    expect(Number(res.body.data.amount)).toBe(priceValue);
    expect(res.body.data.status).toBe('PENDING');
  });

  it('rejects unauthenticated booking', async () => {
    const res = await request(app)
      .post('/api/v1/bookings')
      .send({ centreTestId, appointmentDateTime: future() });
    expect(res.status).toBe(401);
  });

  it('rejects client-supplied amount (strict schema)', async () => {
    const res = await request(app)
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ centreTestId, appointmentDateTime: future(), amount: 1 });
    expect(res.status).toBe(400);
  });

  it('rejects past appointment', async () => {
    const res = await request(app)
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ centreTestId, appointmentDateTime: new Date(Date.now() - 1000).toISOString() });
    expect(res.status).toBe(422);
  });

  it("user cannot read another user's booking", async () => {
    const created = await request(app)
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ centreTestId, appointmentDateTime: future() });
    const res = await request(app)
      .get(`/api/v1/bookings/${created.body.data.id}`)
      .set('Authorization', `Bearer ${otherUserToken}`);
    expect(res.status).toBe(403);
  });

  it('cancels a pending booking', async () => {
    const created = await request(app)
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ centreTestId, appointmentDateTime: future() });
    const res = await request(app)
      .patch(`/api/v1/bookings/${created.body.data.id}/cancel`)
      .set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('CANCELLED');
  });

  it('rejects cancelling an already cancelled booking', async () => {
    const created = await request(app)
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ centreTestId, appointmentDateTime: future() });
    await request(app)
      .patch(`/api/v1/bookings/${created.body.data.id}/cancel`)
      .set('Authorization', `Bearer ${userToken}`);
    const res = await request(app)
      .patch(`/api/v1/bookings/${created.body.data.id}/cancel`)
      .set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(409);
  });
});