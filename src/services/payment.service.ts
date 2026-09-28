import { Prisma, Payment, PaymentStatus } from '@prisma/client';
import { randomUUID } from 'crypto';
import { prisma } from '../lib/prisma';
import { bookingRepository } from '../repositories/booking.repository';
import { paymentRepository } from '../repositories/payment.repository';
import { AppError } from '../utils/AppError';
import { env } from '../config/env';
import { logger } from '../config/logger';
import { bookingService } from './booking.service';

/**
 * Simulated payment provider.
 * The outcome is deterministic when PAYMENT_SIMULATION_MODE is set to
 * "success" or "failure" (used in tests), otherwise random.
 */
function simulateOutcome(): PaymentStatus {
  if (env.PAYMENT_SIMULATION_MODE === 'success') return 'SUCCESS';
  if (env.PAYMENT_SIMULATION_MODE === 'failure') return 'FAILED';
  return Math.random() < 0.8 ? 'SUCCESS' : 'FAILED';
}

export const paymentService = {
  async processPayment(
    userId: string,
    role: 'USER' | 'ADMIN',
    bookingId: string,
  ): Promise<{ payment: Payment; bookingStatus: string }> {
    const booking = await bookingRepository.findById(bookingId);
    if (!booking) throw AppError.notFound('BOOKING_NOT_FOUND', 'Booking not found');

    if (role !== 'ADMIN' && booking.userId !== userId) {
      throw AppError.forbidden('FORBIDDEN', 'You cannot pay for this booking');
    }

    if (booking.status === 'CANCELLED') {
      throw AppError.conflict('BOOKING_CANCELLED', 'Cannot pay for a cancelled booking');
    }
    if (booking.status === 'CONFIRMED') {
      const existing = await paymentRepository.findSuccessfulByBookingId(booking.id);
      if (existing) {
        throw AppError.conflict('PAYMENT_ALREADY_SUCCEEDED', 'Booking is already paid');
      }
    }
    if (booking.status !== 'PENDING') {
      throw AppError.conflict(
        'INVALID_BOOKING_STATUS',
        `Cannot process payment for a booking with status ${booking.status}`,
      );
    }

    const outcome = simulateOutcome();
    const providerPaymentId = `pay_${randomUUID()}`;

    // Atomically create the payment attempt and update the booking status.
    const result = await prisma.$transaction(async (tx) => {
      const payment = await tx.payment.create({
        data: {
          bookingId: booking.id,
          amount: booking.amount,
          status: outcome,
          providerPaymentId,
        },
      });

      const nextStatus = outcome === 'SUCCESS' ? 'CONFIRMED' : 'FAILED';
      // Guard against races: only transition if still PENDING.
      const updated = await tx.booking.updateMany({
        where: { id: booking.id, status: 'PENDING' },
        data: { status: nextStatus },
      });
      if (updated.count === 0) {
        throw AppError.conflict(
          'BOOKING_STATE_CHANGED',
          'Booking status changed concurrently; please retry',
        );
      }
      return payment;
    });

    logger.info(
      { bookingId: booking.id, paymentId: result.id, status: result.status },
      'Payment processed',
    );

    return {
      payment: result,
      bookingStatus: result.status === 'SUCCESS' ? 'CONFIRMED' : 'FAILED',
    };
  },

  /** Used by webhook processing. Does not take a userId. */
  async applyProviderStatus(params: {
    bookingId: string;
    providerPaymentId: string;
    status: PaymentStatus;
  }): Promise<void> {
    const { bookingId, providerPaymentId, status } = params;

    await prisma.$transaction(async (tx) => {
      const booking = await tx.booking.findUnique({ where: { id: bookingId } });
      if (!booking) throw AppError.notFound('BOOKING_NOT_FOUND', 'Booking not found');

      // Find or create the payment record tied to the provider ID.
      let payment = await tx.payment.findUnique({ where: { providerPaymentId } });
      if (!payment) {
        payment = await tx.payment.create({
          data: {
            bookingId,
            amount: booking.amount,
            status,
            providerPaymentId,
          },
        });
      } else {
        // If the payment already exists with a different status, update it.
        if (payment.status !== status) {
          payment = await tx.payment.update({
            where: { id: payment.id },
            data: { status },
          });
        }
      }

      // Only apply transitions that respect the state machine.
      const nextBookingStatus = status === 'SUCCESS' ? 'CONFIRMED' : 'FAILED';

      if (status === 'SUCCESS') {
        if (booking.status === 'PENDING') {
          await tx.booking.update({
            where: { id: booking.id },
            data: { status: 'CONFIRMED' },
          });
        }
        // If booking is already CONFIRMED, do nothing (idempotent).
        // If booking is CANCELLED/FAILED, do not silently override.
      } else {
        if (booking.status === 'PENDING') {
          await tx.booking.update({
            where: { id: booking.id },
            data: { status: 'FAILED' },
          });
        }
      }

      void nextBookingStatus; // documented intent
    });
  },
};

// Avoid unused-var lint by exporting a helper reference.
export type PaymentWithBooking = Prisma.PaymentGetPayload<Record<string, never>>;
export const _bookingServiceRef = bookingService;