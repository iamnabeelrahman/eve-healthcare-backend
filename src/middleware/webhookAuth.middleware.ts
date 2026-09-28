import { NextFunction, Request, Response } from 'express';
import { timingSafeEqual } from 'crypto';
import { env } from '../config/env';
import { AppError } from '../utils/AppError';

export function webhookAuth(req: Request, _res: Response, next: NextFunction): void {
  const provided = req.headers['x-webhook-secret'];
  if (typeof provided !== 'string' || provided.length === 0) {
    return next(AppError.unauthorized('INVALID_WEBHOOK_SECRET', 'Missing webhook secret'));
  }
  const expected = env.WEBHOOK_SECRET;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return next(AppError.unauthorized('INVALID_WEBHOOK_SECRET', 'Invalid webhook secret'));
  }
  next();
}