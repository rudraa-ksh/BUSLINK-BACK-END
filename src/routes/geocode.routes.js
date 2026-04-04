import { Router } from 'express';
import * as ctrl from '../controllers/geocode.controller.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

router.get('/geocode/search', ctrl.geocodeSearch);
router.get('/geocode/reverse', ctrl.reverseGeocode);
router.get('/navigation/walking', ctrl.walkingNavigation);

export default router;
