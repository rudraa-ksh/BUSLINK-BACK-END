const { Router } = require('express');
const ctrl = require('../controllers/user.controller');
const { authenticate } = require('../middleware/auth');
const validate = require('../middleware/validate');
const {
  updateProfileValidation,
  changePasswordValidation,
  createRecentValidation,
} = require('../validators/user.validator');

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

module.exports = router;
