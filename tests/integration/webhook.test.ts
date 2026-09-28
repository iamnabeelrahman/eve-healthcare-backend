import request from 'supertest';
import { Express } from 'express';
import { createApp } from '../../src/app';
import { prisma } from '../../src/lib/prisma';
import { resetDb, makeAdmin, signupAndLogin } from '../helpers';

let app: Express;
let centreTestId: string;
let bookingId: string;
let userToken: string;

const SECRET = process.env.WEBHOOK_SECRET as string;

beforeAll(() => {
  app = createApp();
});

beforeEach(async () => {
  await resetDb();
  userToken = await signupAndLogin(app, 'w@example.com');
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
    .send({ testId: test.body.data.id, price: 100 });
  centreTestId = assoc.body.data.id;

  const booking = await request(app)
    .post('/api/v1/bookings')
    .set('Authorization', `Bearer ${userToken}`)
    .send({
      centreTestId,
      appointmentDateTime: new Date(Date.now() + 86_400_000).toISOString(),
    });
  bookingId = booking.body.data.id;
});

afterAll(async () => {
  await prisma.$disconnect();
});

function payload(overrides: Record<string, unknown> = {}) {
  return {
    eventId: 'evt_1',
    eventType: 'payment.status_updated',
    paymentId: 'pay_1',
    bookingId,
    status: 'SUCCESS',
    ...overrides,
  };
}

describe('Webhook', () => {
  it('rejects missing secret', async () => {
    const res = await request(app).post('/api/v1/payments/webhook').send(payload());
    expect(res.status).toBe(401);
  });

  it('rejects invalid secret', async () => {
    const res = await request(app)
      .post('/api/v1/payments/webhook')
      .set('x-webhook-secret', 'wrong')
      .send(payload());
    expect(res.status).toBe(401);
  });

  it('processes a valid webhook and confirms booking', async () => {
    const res = await request(app)
      .post('/api/v1/payments/webhook')
      .set('x-webhook-secret', SECRET)
      .send(payload());
    expect(res.status).toBe(200);
    const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
    expect(booking?.status).toBe('CONFIRMED');
  });

  it('is idempotent — duplicate event has no side effects', async () => {
    await request(app)
      .post('/api/v1/payments/webhook')
      .set('x-webhook-secret', SECRET)
      .send(payload());
    const res = await request(app)
      .post('/api/v1/payments/webhook')
      .set('x-webhook-secret', SECRET)
      .send(payload());
    expect(res.status).toBe(200);
    expect(res.body.data.duplicate).toBe(true);

    const payments = await prisma.payment.findMany({ where: { bookingId } });
    expect(payments.length).toBe(1);
  });

  it('handles concurrent duplicates safely', async () => {
    const results = await Promise.all(
      Array.from({ length: 5 }).map(() =>
        request(app)
          .post('/api/v1/payments/webhook')
          .set('x-webhook-secret', SECRET)
          .send(payload({ eventId: 'evt_concurrent', paymentId: 'pay_concurrent' })),
      ),
    );
    expect(results.every((r) => r.status === 200)).toBe(true);

    const events = await prisma.webhookEvent.findMany({ where: { eventId: 'evt_concurrent' } });
    expect(events.length).toBe(1);

    const payments = await prisma.payment.findMany({ where: { providerPaymentId: 'pay_concurrent' } });
    expect(payments.length).toBe(1);
  });

  it('failed webhook marks booking FAILED', async () => {
    await request(app)
      .post('/api/v1/payments/webhook')
      .set('x-webhook-secret', SECRET)
      .send(payload({ eventId: 'evt_f', paymentId: 'pay_f', status: 'FAILED' }));
    const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
    expect(booking?.status).toBe('FAILED');
  });
});