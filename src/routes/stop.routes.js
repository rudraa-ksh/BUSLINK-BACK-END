import { Router } from 'express';
import * as ctrl from '../controllers/stop.controller.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

// Static routes before param routes
router.get('/nearest', ctrl.getNearestStops);
router.get('/search', ctrl.searchStops);
router.get('/', ctrl.listStops);
router.get('/:stopId', ctrl.getStopDetails);

export default router;
