import { Request, Response } from 'express';
import { bookingService } from '../services/booking.service';
import { sendPaginated, sendSuccess } from '../utils/response';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../utils/AppError';

function requireUser(req: Request) {
  if (!req.user) throw AppError.unauthorized('UNAUTHORIZED', 'Authentication required');
  return req.user;
}

export const bookingController = {
  create: asyncHandler(async (req: Request, res: Response) => {
    const user = requireUser(req);
    const booking = await bookingService.create(user.id, req.body);
    return sendSuccess(res, booking, 201);
  }),

  list: asyncHandler(async (req: Request, res: Response) => {
    const user = requireUser(req);
    const { page, limit } = req.query as unknown as { page: number; limit: number };
    const { data, pagination } = await bookingService.list(user.id, user.role, page, limit);
    return sendPaginated(res, data, pagination);
  }),

  get: asyncHandler(async (req: Request, res: Response) => {
    const user = requireUser(req);
    const booking = await bookingService.getById(req.params.id, user.id, user.role);
    return sendSuccess(res, booking);
  }),

  cancel: asyncHandler(async (req: Request, res: Response) => {
    const user = requireUser(req);
    const booking = await bookingService.cancel(req.params.id, user.id, user.role);
    return sendSuccess(res, booking);
  }),
};