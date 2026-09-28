import bcrypt from 'bcrypt';
import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

const ADMIN_EMAIL = 'admin@example.com';
const ADMIN_PASSWORD = 'Admin@12345';
const USER_EMAIL = 'john@example.com';
const USER_PASSWORD = 'User@12345';

async function findOrCreateCentre(name: string, location: string) {
  const existing = await prisma.diagnosticCentre.findFirst({ where: { name } });
  if (existing) return existing;
  return prisma.diagnosticCentre.create({ data: { name, location } });
}

async function findOrCreateTest(name: string, description?: string) {
  const existing = await prisma.diagnosticTest.findFirst({ where: { name } });
  if (existing) return existing;
  return prisma.diagnosticTest.create({ data: { name, description } });
}

async function main(): Promise<void> {
  const adminHash = await bcrypt.hash(ADMIN_PASSWORD, 10);
  const userHash = await bcrypt.hash(USER_PASSWORD, 10);

  await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    update: {},
    create: { name: 'Admin', email: ADMIN_EMAIL, passwordHash: adminHash, role: 'ADMIN' },
  });

  const user1 = await prisma.user.upsert({
    where: { email: USER_EMAIL },
    update: {},
    create: { name: 'John Doe', email: USER_EMAIL, passwordHash: userHash, role: 'USER' },
  });

  await prisma.user.upsert({
    where: { email: 'jane@example.com' },
    update: {},
    create: { name: 'Jane Doe', email: 'jane@example.com', passwordHash: userHash, role: 'USER' },
  });

  // Centres
  const centres = await Promise.all([
    findOrCreateCentre('Downtown Diagnostics', 'Mumbai'),
    findOrCreateCentre('Uptown Labs', 'Delhi'),
    findOrCreateCentre('Coastal Health Centre', 'Chennai'),
  ]);

  // Tests
  const tests = await Promise.all([
    findOrCreateTest('Complete Blood Count', 'CBC panel'),
    findOrCreateTest('Lipid Profile', 'Cholesterol & triglycerides'),
    findOrCreateTest('Blood Sugar Fasting', 'Fasting glucose'),
    findOrCreateTest('Thyroid Panel', 'TSH, T3, T4'),
    findOrCreateTest('Liver Function Test', 'LFT panel'),
    findOrCreateTest('Vitamin D', '25-OH Vitamin D'),
  ]);

  // Centre-specific prices
  const priceMatrix: Record<string, number[]> = {
    'Downtown Diagnostics': [500, 800, 300, 1200, 900, 1500],
    'Uptown Labs': [450, 750, 280, 1100, 850, 1400],
    'Coastal Health Centre': [550, 820, 320, 1250, 950, 1600],
  };

  for (const centre of centres) {
    const centrePrices = priceMatrix[centre.name] ?? [];
    for (let i = 0; i < tests.length; i++) {
      const price = centrePrices[i] ?? 1000;
      await prisma.centreTest.upsert({
        where: { centreId_testId: { centreId: centre.id, testId: tests[i].id } },
        update: { price: new Prisma.Decimal(price) },
        create: {
          centreId: centre.id,
          testId: tests[i].id,
          price: new Prisma.Decimal(price),
        },
      });
    }
  }

  // Sample booking for user1
  const firstCentreTest = await prisma.centreTest.findUnique({
    where: { centreId_testId: { centreId: centres[0].id, testId: tests[0].id } },
  });

  if (firstCentreTest) {
    const existing = await prisma.booking.findFirst({
      where: { userId: user1.id, centreTestId: firstCentreTest.id },
    });
    if (!existing) {
      await prisma.booking.create({
        data: {
          userId: user1.id,
          centreTestId: firstCentreTest.id,
          appointmentDateTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          amount: firstCentreTest.price,
          status: 'PENDING',
        },
      });
    }
  }

  // eslint-disable-next-line no-console
  console.log('Seed complete.');
  // eslint-disable-next-line no-console
  console.log(`Admin: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
  // eslint-disable-next-line no-console
  console.log(`User:  ${USER_EMAIL} / ${USER_PASSWORD}`);
}

main()
  .catch((e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());