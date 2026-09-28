import { BookingStatus, Prisma } from '@prisma/client';
import { bookingRepository, BookingWithRelations } from '../repositories/booking.repository';
import { centreRepository } from '../repositories/centre.repository';
import { centreTestRepository } from '../repositories/centreTest.repository';
import { AppError } from '../utils/AppError';
import { buildPaginationMeta } from '../utils/pagination';
import { PaginatedResult } from '../types';
import { CreateBookingInput } from '../schemas/booking.schema';

const ALLOWED_TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  PENDING: ['CONFIRMED', 'FAILED', 'CANCELLED'],
  CONFIRMED: ['CANCELLED'],
  FAILED: [],
  CANCELLED: [],
};

export const bookingService = {
  /**
   * Create a booking. The amount is snapshotted from CentreTest so the price
   * is frozen even if the centre changes its price later. The client never
   * supplies an amount — the schema rejects unknown fields.
   */
  async create(userId: string, input: CreateBookingInput): Promise<BookingWithRelations> {
    const appointment = new Date(input.appointmentDateTime);
    if (Number.isNaN(appointment.getTime())) {
      throw AppError.badRequest('INVALID_APPOINTMENT', 'Invalid appointment date/time');
    }
    if (appointment.getTime() <= Date.now()) {
      throw AppError.unprocessable(
        'APPOINTMENT_IN_PAST',
        'Appointment date/time must be in the future',
      );
    }

    const centreTest = await centreTestRepository.findById(input.centreTestId);
    if (!centreTest) {
      throw AppError.notFound(
        'CENTRE_TEST_NOT_FOUND',
        'The selected centre/test combination does not exist',
      );
    }

    // Defensive checks (existence of centre and test is implied by FK, but we
    // verify explicitly for clear error semantics).
    const centre = await centreRepository.findById(centreTest.centreId);
    if (!centre) throw AppError.notFound('CENTRE_NOT_FOUND', 'Diagnostic centre not found');

    const booking = await bookingRepository.create({
      userId,
      centreTestId: centreTest.id,
      appointmentDateTime: appointment,
      amount: new Prisma.Decimal(centreTest.price),
    });

    const full = await bookingRepository.findById(booking.id);
    if (!full) throw AppError.internal('BOOKING_CREATION_FAILED', 'Failed to load booking');
    return full;
  },

  async list(
    userId: string,
    role: 'USER' | 'ADMIN',
    page: number,
    limit: number,
  ): Promise<PaginatedResult<BookingWithRelations>> {
    const where: Prisma.BookingWhereInput = role === 'ADMIN' ? {} : { userId };
    const skip = (page - 1) * limit;
    const [data, total] = await bookingRepository.findMany(where, skip, limit);
    return { data, pagination: buildPaginationMeta(page, limit, total) };
  },

  async getById(id: string, userId: string, role: 'USER' | 'ADMIN'): Promise<BookingWithRelations> {
    const booking = await bookingRepository.findById(id);
    if (!booking) throw AppError.notFound('BOOKING_NOT_FOUND', 'Booking not found');
    if (role !== 'ADMIN' && booking.userId !== userId) {
      throw AppError.forbidden('FORBIDDEN', 'You cannot access this booking');
    }
    return booking;
  },

  async cancel(id: string, userId: string, role: 'USER' | 'ADMIN'): Promise<BookingWithRelations> {
    const booking = await bookingRepository.findById(id);
    if (!booking) throw AppError.notFound('BOOKING_NOT_FOUND', 'Booking not found');
    if (role !== 'ADMIN' && booking.userId !== userId) {
      throw AppError.forbidden('FORBIDDEN', 'You cannot modify this booking');
    }
    if (booking.status === 'CANCELLED') {
      throw AppError.conflict('BOOKING_ALREADY_CANCELLED', 'Booking is already cancelled');
    }
    if (!ALLOWED_TRANSITIONS[booking.status].includes('CANCELLED')) {
      throw AppError.conflict(
        'INVALID_STATUS_TRANSITION',
        `Cannot cancel a booking with status ${booking.status}`,
      );
    }
    await bookingRepository.updateStatus(id, 'CANCELLED');
    const updated = await bookingRepository.findById(id);
    if (!updated) throw AppError.internal();
    return updated;
  },

  assertTransition(from: BookingStatus, to: BookingStatus): void {
    if (!ALLOWED_TRANSITIONS[from].includes(to)) {
      throw AppError.conflict(
        'INVALID_STATUS_TRANSITION',
        `Cannot transition booking from ${from} to ${to}`,
      );
    }
  },
};