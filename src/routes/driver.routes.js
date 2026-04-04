import { Router } from 'express';
import * as ctrl from '../controllers/driver.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { driverLocationLimiter } from '../middleware/rateLimiter.js';

const router = Router();

// All driver routes require authentication + driver role
router.use(authenticate, authorize('driver'));

router.get('/assignment', ctrl.getAssignment);
router.get('/trips', ctrl.getTrips);
router.get('/trips/:tripId', ctrl.getTripDetails);
router.post('/trips/:tripId/start', ctrl.startTrip);
router.post('/trips/:tripId/complete', ctrl.completeTrip);
router.put('/location', driverLocationLimiter, ctrl.updateLocation);
router.get('/schedule', ctrl.getDriverSchedule);

export default router;
