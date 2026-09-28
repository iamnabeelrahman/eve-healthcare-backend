import { Request, Response } from 'express';
import { paymentService } from '../services/payment.service';
import { webhookService } from '../services/webhook.service';
import { sendSuccess } from '../utils/response';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../utils/AppError';

export const paymentController = {
  create: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw AppError.unauthorized('UNAUTHORIZED', 'Authentication required');
    const result = await paymentService.processPayment(
      req.user.id,
      req.user.role,
      req.body.bookingId,
    );
    return sendSuccess(res, result, 201);
  }),

  webhook: asyncHandler(async (req: Request, res: Response) => {
    const result = await webhookService.handle(req.body);
    // Always 200 for idempotent events so providers stop retrying.
    return sendSuccess(res, result);
  }),
};