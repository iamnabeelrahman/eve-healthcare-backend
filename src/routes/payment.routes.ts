import { Router } from 'express';
import { paymentController } from '../controllers/payment.controller';
import { validate } from '../middleware/validate.middleware';
import { authenticate } from '../middleware/auth.middleware';
import { webhookAuth } from '../middleware/webhookAuth.middleware';
import { webhookLimiter } from '../middleware/rateLimit.middleware';
import { createPaymentSchema, webhookSchema } from '../schemas/payment.schema';

const router = Router();

// Webhook first — different auth
router.post(
  '/webhook',
  webhookLimiter,
  webhookAuth,
  validate({ body: webhookSchema }),
  paymentController.webhook,
);

router.post('/', authenticate, validate({ body: createPaymentSchema }), paymentController.create);

export default router;
