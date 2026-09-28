import { NextFunction, Request, Response } from 'express';
import { AppError } from '../utils/AppError';
import { logger } from '../config/logger';
import { env } from '../config/env';
import { Prisma } from '@prisma/client';

export function notFoundHandler(_req: Request, _res: Response, next: NextFunction): void {
  next(AppError.notFound('NOT_FOUND', 'Route not found'));
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  let statusCode = 500;
  let code = 'INTERNAL_ERROR';
  let message = 'Internal server error';
  let details: unknown;

  if (err instanceof AppError) {
    statusCode = err.statusCode;
    code = err.code;
    message = err.message;
    details = err.details;
  } else if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      statusCode = 409;
      code = 'CONFLICT';
      message = 'Resource already exists';
    } else if (err.code === 'P2025') {
      statusCode = 404;
      code = 'NOT_FOUND';
      message = 'Resource not found';
    } else {
      statusCode = 400;
      code = 'DB_ERROR';
      message = 'Database request error';
    }
  }

  logger.error({
    requestId: req.requestId,
    method: req.method,
    path: req.path,
    statusCode,
    code,
    err: err instanceof Error ? err.message : String(err),
  });

  const body: Record<string, unknown> = { success: false, error: { code, message } };
  if (details !== undefined) (body.error as Record<string, unknown>).details = details;
  if (env.NODE_ENV !== 'production' && err instanceof Error && !(err instanceof AppError)) {
    (body.error as Record<string, unknown>).stack = err.stack;
  }

  res.status(statusCode).json(body);
}