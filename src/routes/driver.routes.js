const { Router } = require('express');
const ctrl = require('../controllers/driver.controller');
const { authenticate, authorize } = require('../middleware/auth');
const { driverLocationLimiter } = require('../middleware/rateLimiter');

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

module.exports = router;
