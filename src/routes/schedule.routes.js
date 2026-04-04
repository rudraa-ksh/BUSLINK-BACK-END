import { Router } from 'express';
import * as ctrl from '../controllers/schedule.controller.js';
import { authenticate } from '../middleware/auth.js';

const router = Router({ mergeParams: true }); // mergeParams to access :busId

router.use(authenticate);

router.get('/', ctrl.getSchedule);
router.get('/next-stop', ctrl.getNextStop);

export default router;
