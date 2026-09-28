import { Router } from 'express';
import { bookingController } from '../controllers/booking.controller';
import { validate } from '../middleware/validate.middleware';
import { authenticate } from '../middleware/auth.middleware';
import { bookingIdParam, createBookingSchema } from '../schemas/booking.schema';
import { paginationQuery } from '../schemas/common.schema';

const router = Router();

router.use(authenticate);

router.post('/', validate({ body: createBookingSchema }), bookingController.create);
router.get('/', validate({ query: paginationQuery }), bookingController.list);
router.get('/:id', validate({ params: bookingIdParam }), bookingController.get);
router.patch('/:id/cancel', validate({ params: bookingIdParam }), bookingController.cancel);

export default router;