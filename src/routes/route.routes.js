import { Router } from 'express';
import * as ctrl from '../controllers/route.controller.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

router.get('/', ctrl.listRoutes);
router.get('/:routeId', ctrl.getRouteDetails);

export default router;
