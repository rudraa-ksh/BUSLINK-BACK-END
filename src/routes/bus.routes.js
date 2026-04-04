import { Router } from 'express';
import * as ctrl from '../controllers/bus.controller.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

// Static routes MUST come before param routes
router.get('/nearby', ctrl.getNearbyBuses);
router.get('/search', ctrl.searchBuses);
router.get('/', ctrl.listBuses);
router.get('/:busId', ctrl.getBusDetails);
router.get('/:busId/location', ctrl.getBusLocation);

export default router;
