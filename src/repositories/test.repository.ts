import { DiagnosticTest } from '@prisma/client';
import { prisma } from '../lib/prisma';

export const testRepository = {
  findMany(skip: number, take: number): Promise<[DiagnosticTest[], number]> {
    return prisma.$transaction([
      prisma.diagnosticTest.findMany({
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.diagnosticTest.count(),
    ]);
  },
  findById(id: string): Promise<DiagnosticTest | null> {
    return prisma.diagnosticTest.findUnique({ where: { id } });
  },
  create(data: { name: string; description?: string }): Promise<DiagnosticTest> {
    return prisma.diagnosticTest.create({ data });
  },
  update(
    id: string,
    data: Partial<{ name: string; description?: string }>,
  ): Promise<DiagnosticTest> {
    return prisma.diagnosticTest.update({ where: { id }, data });
  },
  delete(id: string): Promise<DiagnosticTest> {
    return prisma.diagnosticTest.delete({ where: { id } });
  },
};