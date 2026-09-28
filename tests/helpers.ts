import request from 'supertest';
import { Express } from 'express';
import { prisma } from '../src/lib/prisma';

export async function resetDb(): Promise<void> {
  await prisma.webhookEvent.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.centreTest.deleteMany();
  await prisma.diagnosticTest.deleteMany();
  await prisma.diagnosticCentre.deleteMany();
  await prisma.user.deleteMany();
}

export async function signupAndLogin(
  app: Express,
  email = 'u@example.com',
  password = 'Passw0rd!',
): Promise<string> {
  await request(app).post('/api/v1/auth/signup').send({ name: 'U', email, password });
  const login = await request(app).post('/api/v1/auth/login').send({ email, password });
  return login.body.data.token as string;
}

export async function makeAdmin(
  email = 'admin@example.com',
  password = 'Admin@12345',
): Promise<string> {
  const bcrypt = await import('bcrypt');
  const hash = await bcrypt.hash(password, 10);
  await prisma.user.upsert({
    where: { email },
    update: {},
    create: { name: 'Admin', email, passwordHash: hash, role: 'ADMIN' },
  });
  const { signToken } = await import('../src/utils/jwt');
  const user = await prisma.user.findUniqueOrThrow({ where: { email } });
  return signToken({ sub: user.id, email: user.email, role: user.role });
}
