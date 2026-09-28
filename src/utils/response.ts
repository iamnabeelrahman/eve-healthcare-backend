import { Response } from 'express';
import { PaginationMeta } from '../types';

export function sendSuccess<T>(res: Response, data: T, status = 200): Response {
  return res.status(status).json({ success: true, data });
}

export function sendPaginated<T>(
  res: Response,
  data: T[],
  pagination: PaginationMeta,
  status = 200,
): Response {
  return res.status(status).json({ success: true, data, pagination });
}
