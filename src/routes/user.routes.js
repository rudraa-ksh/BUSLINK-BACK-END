import { Router } from 'express';
import * as ctrl from '../controllers/user.controller.js';
import { authenticate } from '../middleware/auth.js';
import validate from '../middleware/validate.js';
import {
  updateProfileValidation,
  changePasswordValidation,
  createRecentValidation,
} from '../validators/user.validator.js';

const router = Router();

// All user routes require authentication
router.use(authenticate);

router.get('/me', ctrl.getProfile);
router.put('/me', updateProfileValidation, validate, ctrl.updateProfile);
router.delete('/me', ctrl.deleteAccount);
router.put('/me/password', changePasswordValidation, validate, ctrl.changePassword);
router.get('/me/recents', ctrl.getRecents);
router.post('/me/recents', createRecentValidation, validate, ctrl.createRecent);
router.delete('/me/recents/:recentId', ctrl.deleteRecent);

export default router;
