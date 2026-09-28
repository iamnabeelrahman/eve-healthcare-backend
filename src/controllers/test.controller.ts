import { Request, Response } from 'express';
import { testService } from '../services/test.service';
import { sendPaginated, sendSuccess } from '../utils/response';
import { asyncHandler } from '../utils/asyncHandler';

export const testController = {
  list: asyncHandler(async (req: Request, res: Response) => {
    const { page, limit } = req.query as unknown as { page: number; limit: number };
    const { data, pagination } = await testService.list(page, limit);
    return sendPaginated(res, data, pagination);
  }),

  get: asyncHandler(async (req: Request, res: Response) => {
    const test = await testService.getById(req.params.id);
    return sendSuccess(res, test);
  }),

  create: asyncHandler(async (req: Request, res: Response) => {
    const test = await testService.create(req.body);
    return sendSuccess(res, test, 201);
  }),

  update: asyncHandler(async (req: Request, res: Response) => {
    const test = await testService.update(req.params.id, req.body);
    return sendSuccess(res, test);
  }),

  remove: asyncHandler(async (req: Request, res: Response) => {
    await testService.remove(req.params.id);
    return res.status(204).send();
  }),
};