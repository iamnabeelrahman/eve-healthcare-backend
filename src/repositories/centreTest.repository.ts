import { CentreTest, Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';

export interface CentreTestWithRelations extends CentreTest {
  test?: { id: string; name: string; description: string | null };
  centre?: { id: string; name: string; location: string };
}

export const centreTestRepository = {
  findByCentreId(centreId: string): Promise<CentreTestWithRelations[]> {
    return prisma.centreTest.findMany({
      where: { centreId },
      include: { test: { select: { id: true, name: true, description: true } } },
      orderBy: { createdAt: 'desc' },
    });
  },
  findByCentreAndTest(centreId: string, testId: string): Promise<CentreTest | null> {
    return prisma.centreTest.findUnique({
      where: { centreId_testId: { centreId, testId } },
    });
  },
  findById(id: string): Promise<CentreTestWithRelations | null> {
    return prisma.centreTest.findUnique({
      where: { id },
      include: {
        test: { select: { id: true, name: true, description: true } },
        centre: { select: { id: true, name: true, location: true } },
      },
    });
  },
  create(data: { centreId: string; testId: string; price: number }): Promise<CentreTest> {
    return prisma.centreTest.create({
      data: {
        centreId: data.centreId,
        testId: data.testId,
        price: new Prisma.Decimal(data.price),
      },
    });
  },
  updatePrice(centreId: string, testId: string, price: number): Promise<CentreTest> {
    return prisma.centreTest.update({
      where: { centreId_testId: { centreId, testId } },
      data: { price: new Prisma.Decimal(price) },
    });
  },
  delete(centreId: string, testId: string): Promise<CentreTest> {
    return prisma.centreTest.delete({
      where: { centreId_testId: { centreId, testId } },
    });
  },
};
