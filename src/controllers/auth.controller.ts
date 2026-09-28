import { Request, Response } from 'express';
import { authService } from '../services/auth.service';
import { sendSuccess } from '../utils/response';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../utils/AppError';

export const authController = {
  signup: asyncHandler(async (req: Request, res: Response) => {
    const user = await authService.signup(req.body);
    return sendSuccess(res, user, 201);
  }),

  login: asyncHandler(async (req: Request, res: Response) => {
    const result = await authService.login(req.body);
    return sendSuccess(res, result);
  }),

  me: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw AppError.unauthorized('UNAUTHORIZED', 'Authentication required');
    const user = await authService.getCurrentUser(req.user.id);
    return sendSuccess(res, user);
  }),
};