import { Router } from 'express';
import * as ctrl from '../controllers/admin.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

// All admin routes require authentication + admin role
router.use(authenticate, authorize('admin'));

// ─── Dashboard ──────────────────────────────────────────
router.get('/stats', ctrl.getDashboardStats);

// ─── Buses ──────────────────────────────────────────────
router.get('/buses', ctrl.listBuses);
router.post('/buses', ctrl.createBus);
router.get('/buses/:busId', ctrl.getBus);
router.put('/buses/:busId', ctrl.updateBus);
router.delete('/buses/:busId', ctrl.deleteBus);

// ─── Drivers ────────────────────────────────────────────
router.get('/drivers', ctrl.listDrivers);
router.post('/drivers', ctrl.createDriver);
router.get('/drivers/:driverId', ctrl.getDriver);
router.put('/drivers/:driverId', ctrl.updateDriver);
router.delete('/drivers/:driverId', ctrl.deleteDriver);

// ─── Routes ─────────────────────────────────────────────
router.get('/routes', ctrl.listRoutes);
router.post('/routes', ctrl.createRoute);
router.get('/routes/:routeId', ctrl.getRoute);
router.put('/routes/:routeId', ctrl.updateRoute);
router.delete('/routes/:routeId', ctrl.deleteRoute);

// ─── Stops (for admin forms and full CRUD) ──────────────
router.get('/stops', ctrl.listStops);
router.post('/stops', ctrl.createStop);
router.get('/stops/:stopId', ctrl.getStop);
router.put('/stops/:stopId', ctrl.updateStop);
router.delete('/stops/:stopId', ctrl.deleteStop);

// ─── Mappings ───────────────────────────────────────────
router.get('/mappings', ctrl.listMappings);
router.post('/mappings/bus-route', ctrl.assignBusToRoute);
router.post('/mappings/bus-driver', ctrl.assignDriverToBus);
router.post('/mappings/assign-all', ctrl.assignAll);          // bus + driver + route in one call
router.delete('/mappings/bus-route/:busId', ctrl.unassignBusFromRoute);
router.delete('/mappings/bus-driver/:busId', ctrl.unassignDriverFromBus);

export default router;
