import { DiagnosticCentre } from '@prisma/client';
import { prisma } from '../lib/prisma';

export const centreRepository = {
  findMany(skip: number, take: number): Promise<[DiagnosticCentre[], number]> {
    return prisma.$transaction([
      prisma.diagnosticCentre.findMany({
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.diagnosticCentre.count(),
    ]);
  },
  findById(id: string): Promise<DiagnosticCentre | null> {
    return prisma.diagnosticCentre.findUnique({ where: { id } });
  },
  create(data: { name: string; location: string }): Promise<DiagnosticCentre> {
    return prisma.diagnosticCentre.create({ data });
  },
  update(id: string, data: Partial<{ name: string; location: string }>): Promise<DiagnosticCentre> {
    return prisma.diagnosticCentre.update({ where: { id }, data });
  },
  delete(id: string): Promise<DiagnosticCentre> {
    return prisma.diagnosticCentre.delete({ where: { id } });
  },
};
