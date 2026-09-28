import { Router } from 'express';
import { centreController } from '../controllers/centre.controller';
import { validate } from '../middleware/validate.middleware';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';
import {
  associateTestSchema,
  centreIdParam,
  centreTestParam,
  centreTestsParam,
  createCentreSchema,
  updateCentreSchema,
  updateCentreTestPriceSchema,
} from '../schemas/centre.schema';
import { paginationQuery } from '../schemas/common.schema';

const router = Router();

// Public reads
router.get('/', validate({ query: paginationQuery }), centreController.list);
router.get('/:id', validate({ params: centreIdParam }), centreController.get);
router.get(
  '/:centreId/tests',
  validate({ params: centreTestsParam }),
  centreController.listTests,
);

// Admin-only management
router.post(
  '/',
  authenticate,
  requireRole('ADMIN'),
  validate({ body: createCentreSchema }),
  centreController.create,
);
router.patch(
  '/:id',
  authenticate,
  requireRole('ADMIN'),
  validate({
    params: centreIdParam,
    body: updateCentreSchema as any,
  }),
  centreController.update,
);
router.delete(
  '/:id',
  authenticate,
  requireRole('ADMIN'),
  validate({ params: centreIdParam }),
  centreController.remove,
);

// Centre ↔ Test relationship
router.post(
  '/:centreId/tests',
  authenticate,
  requireRole('ADMIN'),
  validate({ params: centreTestsParam, body: associateTestSchema }),
  centreController.associateTest,
);
router.patch(
  '/:centreId/tests/:testId',
  authenticate,
  requireRole('ADMIN'),
  validate({ params: centreTestParam, body: updateCentreTestPriceSchema }),
  centreController.updateCentreTest,
);
router.delete(
  '/:centreId/tests/:testId',
  authenticate,
  requireRole('ADMIN'),
  validate({ params: centreTestParam }),
  centreController.removeCentreTest,
);

export default router;