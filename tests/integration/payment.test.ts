import request from 'supertest';
import { Express } from 'express';
import { createApp } from '../../src/app';
import { prisma } from '../../src/lib/prisma';
import { resetDb, makeAdmin, signupAndLogin } from '../helpers';

let app: Express;
let userToken: string;
let centreTestId: string;

beforeAll(() => {
  app = createApp();
});
beforeEach(async () => {
  await resetDb();
  userToken = await signupAndLogin(app, 'p@example.com');
  const admin = await makeAdmin();
  const centre = await request(app)
    .post('/api/v1/centres')
    .set('Authorization', `Bearer ${admin}`)
    .send({ name: 'C', location: 'L' });
  const test = await request(app)
    .post('/api/v1/tests')
    .set('Authorization', `Bearer ${admin}`)
    .send({ name: 'T' });
  const assoc = await request(app)
    .post(`/api/v1/centres/${centre.body.data.id}/tests`)
    .set('Authorization', `Bearer ${admin}`)
    .send({ testId: test.body.data.id, price: 999 });
  centreTestId = assoc.body.data.id;
});
afterAll(async () => {
  await prisma.$disconnect();
});

const future = () => new Date(Date.now() + 86_400_000).toISOString();

async function createBooking(): Promise<string> {
  const res = await request(app)
    .post('/api/v1/bookings')
    .set('Authorization', `Bearer ${userToken}`)
    .send({ centreTestId, appointmentDateTime: future() });
  return res.body.data.id as string;
}

describe('Payments', () => {
  it('successful simulated payment confirms booking (mode=success)', async () => {
    const bookingId = await createBooking();
    const res = await request(app)
      .post('/api/v1/payments')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ bookingId });
    expect(res.status).toBe(201);
    expect(res.body.data.payment.status).toBe('SUCCESS');
    expect(res.body.data.bookingStatus).toBe('CONFIRMED');
  });

  it('rejects payment for non-existent booking', async () => {
    const res = await request(app)
      .post('/api/v1/payments')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ bookingId: '00000000-0000-0000-0000-000000000000' });
    expect(res.status).toBe(404);
  });

  it('rejects duplicate successful payment', async () => {
    const bookingId = await createBooking();
    await request(app)
      .post('/api/v1/payments')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ bookingId });
    const res = await request(app)
      .post('/api/v1/payments')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ bookingId });
    expect(res.status).toBe(409);
  });
});