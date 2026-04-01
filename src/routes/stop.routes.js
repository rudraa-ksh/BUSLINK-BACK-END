const { Router } = require('express');
const ctrl = require('../controllers/stop.controller');
const { authenticate } = require('../middleware/auth');

const router = Router();

router.use(authenticate);

// Static routes before param routes
router.get('/nearest', ctrl.getNearestStops);
router.get('/search', ctrl.searchStops);
router.get('/', ctrl.listStops);
router.get('/:stopId', ctrl.getStopDetails);

module.exports = router;
