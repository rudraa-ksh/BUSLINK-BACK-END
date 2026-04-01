const { Router } = require('express');
const ctrl = require('../controllers/geocode.controller');
const { authenticate } = require('../middleware/auth');

const router = Router();

router.use(authenticate);

router.get('/geocode/search', ctrl.geocodeSearch);
router.get('/geocode/reverse', ctrl.reverseGeocode);
router.get('/navigation/walking', ctrl.walkingNavigation);

module.exports = router;
