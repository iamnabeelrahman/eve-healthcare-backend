import { Router } from 'express';
import { testController } from '../controllers/test.controller';
import { validate } from '../middleware/validate.middleware';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';
import { createTestSchema, testIdParam, updateTestSchema } from '../schemas/test.schema';
import { paginationQuery } from '../schemas/common.schema';

const router = Router();

router.get('/', validate({ query: paginationQuery }), testController.list);
router.get('/:id', validate({ params: testIdParam }), testController.get);

router.post(
  '/',
  authenticate,
  requireRole('ADMIN'),
  validate({ body: createTestSchema }),
  testController.create,
);
router.patch(
  '/:id',
  authenticate,
  requireRole('ADMIN'),
  validate({ params: testIdParam, body: updateTestSchema as any }),
  testController.update,
);
router.delete(
  '/:id',
  authenticate,
  requireRole('ADMIN'),
  validate({ params: testIdParam }),
  testController.remove,
);

export default router;
