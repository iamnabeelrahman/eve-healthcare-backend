import { Booking, BookingStatus, Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';

export interface BookingWithRelations extends Booking {
  centreTest?: {
    id: string;
    price: Prisma.Decimal;
    centre: { id: string; name: string; location: string };
    test: { id: string; name: string; description: string | null };
  };
}

export const bookingRepository = {
  create(data: {
    userId: string;
    centreTestId: string;
    appointmentDateTime: Date;
    amount: Prisma.Decimal;
  }): Promise<Booking> {
    return prisma.booking.create({ data });
  },
  findById(id: string): Promise<BookingWithRelations | null> {
    return prisma.booking.findUnique({
      where: { id },
      include: {
        centreTest: {
          include: {
            centre: { select: { id: true, name: true, location: true } },
            test: { select: { id: true, name: true, description: true } },
          },
        },
      },
    });
  },
  findMany(
    where: Prisma.BookingWhereInput,
    skip: number,
    take: number,
  ): Promise<[BookingWithRelations[], number]> {
    return prisma.$transaction([
      prisma.booking.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          centreTest: {
            include: {
              centre: { select: { id: true, name: true, location: true } },
              test: { select: { id: true, name: true, description: true } },
            },
          },
        },
      }),
      prisma.booking.count({ where }),
    ]);
  },
  updateStatus(id: string, status: BookingStatus): Promise<Booking> {
    return prisma.booking.update({ where: { id }, data: { status } });
  },
};