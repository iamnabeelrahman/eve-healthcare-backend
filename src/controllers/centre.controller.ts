import { Request, Response } from 'express';
import { centreService } from '../services/centre.service';
import { sendPaginated, sendSuccess } from '../utils/response';
import { asyncHandler } from '../utils/asyncHandler';

export const centreController = {
  list: asyncHandler(async (req: Request, res: Response) => {
    const { page, limit } = req.query as unknown as { page: number; limit: number };
    const { data, pagination } = await centreService.list(page, limit);
    return sendPaginated(res, data, pagination);
  }),

  get: asyncHandler(async (req: Request, res: Response) => {
    const centre = await centreService.getById(req.params.id);
    return sendSuccess(res, centre);
  }),

  create: asyncHandler(async (req: Request, res: Response) => {
    const centre = await centreService.create(req.body);
    return sendSuccess(res, centre, 201);
  }),

  update: asyncHandler(async (req: Request, res: Response) => {
    const centre = await centreService.update(req.params.id, req.body);
    return sendSuccess(res, centre);
  }),

  remove: asyncHandler(async (req: Request, res: Response) => {
    await centreService.remove(req.params.id);
    return res.status(204).send();
  }),

  listTests: asyncHandler(async (req: Request, res: Response) => {
    const data = await centreService.listTestsForCentre(req.params.centreId);
    return sendSuccess(res, data);
  }),

  associateTest: asyncHandler(async (req: Request, res: Response) => {
    const created = await centreService.associateTest(
      req.params.centreId,
      req.body.testId,
      req.body.price,
    );
    return sendSuccess(res, created, 201);
  }),

  updateCentreTest: asyncHandler(async (req: Request, res: Response) => {
    const updated = await centreService.updateCentreTestPrice(
      req.params.centreId,
      req.params.testId,
      req.body.price,
    );
    return sendSuccess(res, updated);
  }),

  removeCentreTest: asyncHandler(async (req: Request, res: Response) => {
    await centreService.removeCentreTest(req.params.centreId, req.params.testId);
    return res.status(204).send();
  }),
};