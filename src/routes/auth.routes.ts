import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { validate } from '../middleware/validate.middleware';
import { authenticate } from '../middleware/auth.middleware';
import { authLimiter } from '../middleware/rateLimit.middleware';
import { signupSchema, loginSchema } from '../schemas/auth.schema';

const router = Router();

router.post('/signup', authLimiter, validate({ body: signupSchema }), authController.signup);
router.post('/login', authLimiter, validate({ body: loginSchema }), authController.login);
router.get('/me', authenticate, authController.me);

export default router;