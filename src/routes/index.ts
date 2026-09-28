import { Router } from 'express';
import authRoutes from './auth.routes';
import centreRoutes from './centre.routes';
import testRoutes from './test.routes';
import bookingRoutes from './booking.routes';
import paymentRoutes from './payment.routes';
import healthRoutes from './health.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/centres', centreRoutes);
router.use('/tests', testRoutes);
router.use('/bookings', bookingRoutes);
router.use('/payments', paymentRoutes);

export { router as apiRouter, healthRoutes };
