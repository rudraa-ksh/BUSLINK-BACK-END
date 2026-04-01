const { Router } = require('express');
const ctrl = require('../controllers/schedule.controller');
const { authenticate } = require('../middleware/auth');

const router = Router({ mergeParams: true }); // mergeParams to access :busId

router.use(authenticate);

router.get('/', ctrl.getSchedule);
router.get('/next-stop', ctrl.getNextStop);

module.exports = router;
