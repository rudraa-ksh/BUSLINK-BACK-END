const { Router } = require('express');
const ctrl = require('../controllers/route.controller');
const { authenticate } = require('../middleware/auth');

const router = Router();

router.use(authenticate);

router.get('/', ctrl.listRoutes);
router.get('/:routeId', ctrl.getRouteDetails);

module.exports = router;
