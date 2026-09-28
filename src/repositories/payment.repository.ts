import { Payment, PaymentStatus, Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';

export const paymentRepository = {
  create(data: {
    bookingId: string;
    amount: Prisma.Decimal;
    status: PaymentStatus;
    providerPaymentId: string;
  }): Promise<Payment> {
    return prisma.payment.create({ data });
  },
  findByProviderPaymentId(providerPaymentId: string): Promise<Payment | null> {
    return prisma.payment.findUnique({ where: { providerPaymentId } });
  },
  findSuccessfulByBookingId(bookingId: string): Promise<Payment | null> {
    return prisma.payment.findFirst({
      where: { bookingId, status: 'SUCCESS' },
    });
  },
  updateStatus(id: string, status: PaymentStatus): Promise<Payment> {
    return prisma.payment.update({ where: { id }, data: { status } });
  },
};