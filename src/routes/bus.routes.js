const { Router } = require('express');
const ctrl = require('../controllers/bus.controller');
const { authenticate } = require('../middleware/auth');

const router = Router();

router.use(authenticate);

// Static routes MUST come before param routes
router.get('/nearby', ctrl.getNearbyBuses);
router.get('/search', ctrl.searchBuses);
router.get('/', ctrl.listBuses);
router.get('/:busId', ctrl.getBusDetails);
router.get('/:busId/location', ctrl.getBusLocation);

module.exports = router;
