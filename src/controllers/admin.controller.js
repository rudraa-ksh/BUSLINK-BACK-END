import bcrypt from 'bcryptjs';
import prisma from '../config/db.js';
import AppError from '../utils/AppError.js';

// ═══════════════════════════════════════════════════════════
//  BUSES
// ═══════════════════════════════════════════════════════════

// ─── GET /admin/buses ───────────────────────────────────
export const listBuses = async (req, res, next) => {
  try {
    const { search, status, type, sort, insuranceStatus, pucStatus } = req.query;
    const where = {};

    if (search) {
      where.plateNumber = { contains: search, mode: 'insensitive' };
    }
    if (status && status !== 'all') {
      where.status = status;
    }
    if (type && type !== 'all') {
      where.type = type;
    }

    let orderBy = { createdAt: 'desc' };
    if (sort === 'A-Z') orderBy = { plateNumber: 'asc' };
    if (sort === 'Z-A') orderBy = { plateNumber: 'desc' };
    if (sort === 'odometer-asc') orderBy = { odometer: 'asc' };
    if (sort === 'odometer-desc') orderBy = { odometer: 'desc' };
    if (sort === 'newest') orderBy = { dateOfJoining: 'desc' };
    if (sort === 'oldest') orderBy = { dateOfJoining: 'asc' };

    const buses = await prisma.bus.findMany({
      where,
      orderBy,
      include: {
        route: { select: { id: true, name: true } },
        driver: { select: { id: true, name: true, email: true } },
      },
    });

    const now = new Date();

    let result = buses.map((b) => ({
      busId: b.id,
      plateNumber: b.plateNumber,
      type: b.type,
      odometer: b.odometer,
      capacity: b.capacity,
      status: b.status,
      insuranceExpiry: b.insuranceExpiry,
      pucExpiry: b.pucExpiry,
      dateOfJoining: b.dateOfJoining,
      routeId: b.routeId,
      routeName: b.route?.name || null,
      driverId: b.driverId,
      driverName: b.driver?.name || null,
      driverEmail: b.driver?.email || null,
    }));

    // Filter by insurance status
    if (insuranceStatus === 'valid') {
      result = result.filter((b) => b.insuranceExpiry && new Date(b.insuranceExpiry) > now);
    } else if (insuranceStatus === 'expired') {
      result = result.filter((b) => !b.insuranceExpiry || new Date(b.insuranceExpiry) <= now);
    }

    // Filter by PUC status
    if (pucStatus === 'valid') {
      result = result.filter((b) => b.pucExpiry && new Date(b.pucExpiry) > now);
    } else if (pucStatus === 'expired') {
      result = result.filter((b) => !b.pucExpiry || new Date(b.pucExpiry) <= now);
    }

    res.json(result);
  } catch (err) {
    next(err);
  }
};

// ─── POST /admin/buses ──────────────────────────────────
export const createBus = async (req, res, next) => {
  try {
    const { plateNumber, type, capacity, odometer, insuranceExpiry, pucExpiry } = req.body;

    const existing = await prisma.bus.findUnique({ where: { plateNumber } });
    if (existing) {
      throw new AppError('A bus with this plate number already exists', 409);
    }

    const bus = await prisma.bus.create({
      data: {
        plateNumber,
        type: type || 'Non-AC',
        capacity: capacity || 40,
        odometer: odometer || 0,
        insuranceExpiry: insuranceExpiry ? new Date(insuranceExpiry) : null,
        pucExpiry: pucExpiry ? new Date(pucExpiry) : null,
        status: 'idle',
        dateOfJoining: new Date(),
      },
    });

    res.status(201).json({
      busId: bus.id,
      plateNumber: bus.plateNumber,
      message: 'Bus created successfully.',
    });
  } catch (err) {
    next(err);
  }
};

// ─── GET /admin/buses/:busId ────────────────────────────
export const getBus = async (req, res, next) => {
  try {
    const bus = await prisma.bus.findUnique({
      where: { id: req.params.busId },
      include: {
        route: { select: { id: true, name: true } },
        driver: { select: { id: true, name: true, email: true } },
      },
    });

    if (!bus) throw new AppError('Bus not found', 404);

    res.json({
      busId: bus.id,
      plateNumber: bus.plateNumber,
      type: bus.type,
      odometer: bus.odometer,
      capacity: bus.capacity,
      status: bus.status,
      insuranceExpiry: bus.insuranceExpiry,
      pucExpiry: bus.pucExpiry,
      dateOfJoining: bus.dateOfJoining,
      routeId: bus.routeId,
      routeName: bus.route?.name || null,
      driverId: bus.driverId,
      driverName: bus.driver?.name || null,
    });
  } catch (err) {
    next(err);
  }
};

// ─── PUT /admin/buses/:busId ────────────────────────────
export const updateBus = async (req, res, next) => {
  try {
    const { plateNumber, type, capacity, odometer, insuranceExpiry, pucExpiry, status } = req.body;

    const bus = await prisma.bus.findUnique({ where: { id: req.params.busId } });
    if (!bus) throw new AppError('Bus not found', 404);

    // Check plate number uniqueness if changing
    if (plateNumber && plateNumber !== bus.plateNumber) {
      const dup = await prisma.bus.findUnique({ where: { plateNumber } });
      if (dup) throw new AppError('Plate number already in use', 409);
    }

    const data = {};
    if (plateNumber !== undefined) data.plateNumber = plateNumber;
    if (type !== undefined) data.type = type;
    if (capacity !== undefined) data.capacity = capacity;
    if (odometer !== undefined) data.odometer = odometer;
    if (insuranceExpiry !== undefined) data.insuranceExpiry = insuranceExpiry ? new Date(insuranceExpiry) : null;
    if (pucExpiry !== undefined) data.pucExpiry = pucExpiry ? new Date(pucExpiry) : null;
    if (status !== undefined) data.status = status;

    const updated = await prisma.bus.update({
      where: { id: req.params.busId },
      data,
    });

    res.json({
      busId: updated.id,
      plateNumber: updated.plateNumber,
      message: 'Bus updated successfully.',
    });
  } catch (err) {
    next(err);
  }
};

// ─── DELETE /admin/buses/:busId ─────────────────────────
export const deleteBus = async (req, res, next) => {
  try {
    const bus = await prisma.bus.findUnique({ where: { id: req.params.busId } });
    if (!bus) throw new AppError('Bus not found', 404);

    // Clean up related records
    await prisma.schedule.deleteMany({ where: { busId: bus.id } });
    await prisma.trip.deleteMany({ where: { busId: bus.id } });
    await prisma.bus.delete({ where: { id: bus.id } });

    res.json({ message: 'Bus deleted successfully.' });
  } catch (err) {
    next(err);
  }
};

// ═══════════════════════════════════════════════════════════
//  DRIVERS
// ═══════════════════════════════════════════════════════════

// ─── GET /admin/drivers ─────────────────────────────────
export const listDrivers = async (req, res, next) => {
  try {
    const { search, status } = req.query;
    const where = { role: 'driver' };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (status && status !== 'all') {
      where.accountStatus = status;
    }

    const drivers = await prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        accountStatus: true,
        createdAt: true,
        assignedBus: {
          select: {
            id: true,
            plateNumber: true,
            route: { select: { id: true, name: true } },
          },
        },
      },
    });

    res.json(
      drivers.map((d) => ({
        driverId: d.id,
        name: d.name,
        email: d.email,
        status: d.accountStatus,
        createdAt: d.createdAt,
        assignedBus: d.assignedBus
          ? {
            busId: d.assignedBus.id,
            plateNumber: d.assignedBus.plateNumber,
            routeName: d.assignedBus.route?.name || null,
          }
          : null,
      }))
    );
  } catch (err) {
    next(err);
  }
};

// ─── POST /admin/drivers ────────────────────────────────
export const createDriver = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new AppError('An account with this email already exists', 409);
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const driver = await prisma.user.create({
      data: {
        name,
        email,
        hashedPassword,
        role: 'driver',
        accountStatus: 'active',
      },
    });

    res.status(201).json({
      driverId: driver.id,
      name: driver.name,
      email: driver.email,
      message: 'Driver created successfully.',
    });
  } catch (err) {
    next(err);
  }
};

// ─── GET /admin/drivers/:driverId ───────────────────────
export const getDriver = async (req, res, next) => {
  try {
    const driver = await prisma.user.findUnique({
      where: { id: req.params.driverId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        accountStatus: true,
        createdAt: true,
        assignedBus: {
          select: {
            id: true,
            plateNumber: true,
            route: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!driver || driver.role !== 'driver') {
      throw new AppError('Driver not found', 404);
    }

    res.json({
      driverId: driver.id,
      name: driver.name,
      email: driver.email,
      status: driver.accountStatus,
      createdAt: driver.createdAt,
      assignedBus: driver.assignedBus
        ? {
          busId: driver.assignedBus.id,
          plateNumber: driver.assignedBus.plateNumber,
          routeName: driver.assignedBus.route?.name || null,
        }
        : null,
    });
  } catch (err) {
    next(err);
  }
};

// ─── PUT /admin/drivers/:driverId ───────────────────────
export const updateDriver = async (req, res, next) => {
  try {
    const { name, email, password, accountStatus } = req.body;

    const driver = await prisma.user.findUnique({ where: { id: req.params.driverId } });
    if (!driver || driver.role !== 'driver') {
      throw new AppError('Driver not found', 404);
    }

    if (email && email !== driver.email) {
      const dup = await prisma.user.findUnique({ where: { email } });
      if (dup) throw new AppError('Email already in use', 409);
    }

    const data = {};
    if (name !== undefined) data.name = name;
    if (email !== undefined) data.email = email;
    if (accountStatus !== undefined) data.accountStatus = accountStatus;
    if (password) {
      data.hashedPassword = await bcrypt.hash(password, 12);
    }

    const updated = await prisma.user.update({
      where: { id: req.params.driverId },
      data,
    });

    res.json({
      driverId: updated.id,
      name: updated.name,
      email: updated.email,
      message: 'Driver updated successfully.',
    });
  } catch (err) {
    next(err);
  }
};

// ─── DELETE /admin/drivers/:driverId ────────────────────
export const deleteDriver = async (req, res, next) => {
  try {
    const driver = await prisma.user.findUnique({ where: { id: req.params.driverId } });
    if (!driver || driver.role !== 'driver') {
      throw new AppError('Driver not found', 404);
    }

    // Unassign from bus if assigned
    await prisma.bus.updateMany({
      where: { driverId: driver.id },
      data: { driverId: null },
    });

    // Soft delete
    await prisma.user.update({
      where: { id: driver.id },
      data: { accountStatus: 'deleted' },
    });

    res.json({ message: 'Driver deactivated successfully.' });
  } catch (err) {
    next(err);
  }
};

// ═══════════════════════════════════════════════════════════
//  ROUTES
// ═══════════════════════════════════════════════════════════

// ─── GET /admin/routes ──────────────────────────────────
export const listRoutes = async (req, res, next) => {
  try {
    const { search } = req.query;
    const where = {};

    if (search) {
      where.name = { contains: search, mode: 'insensitive' };
    }

    const routes = await prisma.route.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        routeStops: {
          orderBy: { sequence: 'asc' },
          include: { stop: { select: { id: true, name: true } } },
        },
        buses: {
          select: { id: true, plateNumber: true },
        },
      },
    });

    res.json(
      routes.map((r) => ({
        routeId: r.id,
        name: r.name,
        city: r.city,
        distanceKm: r.distanceKm,
        totalStops: r.routeStops.length,
        stops: r.routeStops.map((rs) => ({
          stopId: rs.stop.id,
          name: rs.stop.name,
          sequence: rs.sequence,
          distanceFromOrigin: rs.distanceFromOrigin,
          arrivalTime: rs.arrivalTime,
        })),
        busCount: r.buses.length,
        createdAt: r.createdAt,
      }))
    );
  } catch (err) {
    next(err);
  }
};

// ─── POST /admin/routes ─────────────────────────────────
export const createRoute = async (req, res, next) => {
  try {
    const { name, city, distanceKm, stops } = req.body;

    const route = await prisma.route.create({
      data: {
        name,
        city: city || 'Raipur',
        distanceKm: distanceKm || null,
      },
    });

    // Create route-stop associations if stops provided
    if (stops && Array.isArray(stops) && stops.length > 0) {
      for (let i = 0; i < stops.length; i++) {
        await prisma.routeStop.create({
          data: {
            routeId: route.id,
            stopId: stops[i].stopId,
            sequence: i + 1,
            distanceFromOrigin: stops[i].distanceFromOrigin || 0,
            arrivalTime: stops[i].arrivalTime || null,
          },
        });
      }
    }

    res.status(201).json({
      routeId: route.id,
      name: route.name,
      message: 'Route created successfully.',
    });
  } catch (err) {
    next(err);
  }
};

// ─── GET /admin/routes/:routeId ─────────────────────────
export const getRoute = async (req, res, next) => {
  try {
    const route = await prisma.route.findUnique({
      where: { id: req.params.routeId },
      include: {
        routeStops: {
          orderBy: { sequence: 'asc' },
          include: { stop: { select: { id: true, name: true, lat: true, lng: true } } },
        },
        buses: {
          select: { id: true, plateNumber: true, status: true },
        },
      },
    });

    if (!route) throw new AppError('Route not found', 404);

    res.json({
      routeId: route.id,
      name: route.name,
      city: route.city,
      distanceKm: route.distanceKm,
      stops: route.routeStops.map((rs) => ({
        stopId: rs.stop.id,
        name: rs.stop.name,
        lat: rs.stop.lat,
        lng: rs.stop.lng,
        sequence: rs.sequence,
        distanceFromOrigin: rs.distanceFromOrigin,
        arrivalTime: rs.arrivalTime,
      })),
      buses: route.buses,
    });
  } catch (err) {
    next(err);
  }
};

// ─── PUT /admin/routes/:routeId ─────────────────────────
export const updateRoute = async (req, res, next) => {
  try {
    const { name, city, distanceKm, stops } = req.body;

    const route = await prisma.route.findUnique({ where: { id: req.params.routeId } });
    if (!route) throw new AppError('Route not found', 404);

    const data = {};
    if (name !== undefined) data.name = name;
    if (city !== undefined) data.city = city;
    if (distanceKm !== undefined) data.distanceKm = distanceKm;

    await prisma.route.update({ where: { id: route.id }, data });

    // If stops provided, replace all route stops
    if (stops && Array.isArray(stops)) {
      await prisma.routeStop.deleteMany({ where: { routeId: route.id } });
      for (let i = 0; i < stops.length; i++) {
        await prisma.routeStop.create({
          data: {
            routeId: route.id,
            stopId: stops[i].stopId,
            sequence: i + 1,
            distanceFromOrigin: stops[i].distanceFromOrigin || 0,
            arrivalTime: stops[i].arrivalTime || null,
          },
        });
      }
    }

    res.json({ routeId: route.id, message: 'Route updated successfully.' });
  } catch (err) {
    next(err);
  }
};

// ─── DELETE /admin/routes/:routeId ──────────────────────
export const deleteRoute = async (req, res, next) => {
  try {
    const route = await prisma.route.findUnique({ where: { id: req.params.routeId } });
    if (!route) throw new AppError('Route not found', 404);

    // Unassign buses from this route
    await prisma.bus.updateMany({
      where: { routeId: route.id },
      data: { routeId: null },
    });

    // Delete route stops and route
    await prisma.routeStop.deleteMany({ where: { routeId: route.id } });
    await prisma.route.delete({ where: { id: route.id } });

    res.json({ message: 'Route deleted successfully.' });
  } catch (err) {
    next(err);
  }
};

// ═══════════════════════════════════════════════════════════
//  MAPPINGS
// ═══════════════════════════════════════════════════════════

// ─── GET /admin/mappings ────────────────────────────────
export const listMappings = async (req, res, next) => {
  try {
    const buses = await prisma.bus.findMany({
      where: {
        OR: [
          { routeId: { not: null } },
          { driverId: { not: null } },
        ],
      },
      include: {
        route: { select: { id: true, name: true } },
        driver: { select: { id: true, name: true, email: true } },
      },
    });

    res.json(
      buses.map((b) => ({
        busId: b.id,
        plateNumber: b.plateNumber,
        routeId: b.routeId,
        routeName: b.route?.name || null,
        driverId: b.driverId,
        driverName: b.driver?.name || null,
        driverEmail: b.driver?.email || null,
      }))
    );
  } catch (err) {
    next(err);
  }
};

// ─── POST /admin/mappings/bus-route ─────────────────────
export const assignBusToRoute = async (req, res, next) => {
  try {
    const { busId, routeId } = req.body;

    const bus = await prisma.bus.findUnique({ where: { id: busId } });
    if (!bus) throw new AppError('Bus not found', 404);

    const route = await prisma.route.findUnique({ where: { id: routeId } });
    if (!route) throw new AppError('Route not found', 404);

    await prisma.bus.update({
      where: { id: busId },
      data: { routeId },
    });

    res.json({ message: `Bus ${bus.plateNumber} assigned to ${route.name}.` });
  } catch (err) {
    next(err);
  }
};

// ─── POST /admin/mappings/bus-driver ────────────────────
export const assignDriverToBus = async (req, res, next) => {
  try {
    const { busId, driverId } = req.body;

    const bus = await prisma.bus.findUnique({ where: { id: busId } });
    if (!bus) throw new AppError('Bus not found', 404);

    const driver = await prisma.user.findUnique({ where: { id: driverId } });
    if (!driver || driver.role !== 'driver') {
      throw new AppError('Driver not found', 404);
    }

    // Check if driver is already assigned to another bus
    const existingAssignment = await prisma.bus.findUnique({ where: { driverId } });
    if (existingAssignment && existingAssignment.id !== busId) {
      throw new AppError(
        `Driver is already assigned to bus ${existingAssignment.plateNumber}. Unassign first.`,
        409
      );
    }

    await prisma.bus.update({
      where: { id: busId },
      data: { driverId },
    });

    res.json({ message: `Driver ${driver.name} assigned to bus ${bus.plateNumber}.` });
  } catch (err) {
    next(err);
  }
};

// ─── POST /admin/mappings/assign-all ────────────────────
export const assignAll = async (req, res, next) => {
  try {
    const { busId, routeId, driverId } = req.body;

    if (!busId) throw new AppError('busId is required', 400);
    if (!routeId && !driverId) throw new AppError('Provide at least one of routeId or driverId', 400);

    const bus = await prisma.bus.findUnique({ where: { id: busId } });
    if (!bus) throw new AppError('Bus not found', 404);

    const updateData = {};

    if (routeId) {
      const route = await prisma.route.findUnique({ where: { id: routeId } });
      if (!route) throw new AppError('Route not found', 404);
      updateData.routeId = routeId;
    }

    if (driverId) {
      const driver = await prisma.user.findUnique({ where: { id: driverId } });
      if (!driver || driver.role !== 'driver') throw new AppError('Driver not found', 404);

      // Ensure driver isn't already assigned to a different bus
      const conflict = await prisma.bus.findUnique({ where: { driverId } });
      if (conflict && conflict.id !== busId) {
        throw new AppError(
          `Driver is already assigned to bus ${conflict.plateNumber}. Unassign first.`,
          409
        );
      }
      updateData.driverId = driverId;
    }

    const updated = await prisma.bus.update({
      where: { id: busId },
      data: updateData,
      include: {
        route: { select: { id: true, name: true } },
        driver: { select: { id: true, name: true, email: true } },
      },
    });

    res.json({
      message: 'Assignment successful.',
      busId: updated.id,
      plateNumber: updated.plateNumber,
      route: updated.route ? { routeId: updated.route.id, name: updated.route.name } : null,
      driver: updated.driver
        ? { driverId: updated.driver.id, name: updated.driver.name, email: updated.driver.email }
        : null,
    });
  } catch (err) {
    next(err);
  }
};

// ─── DELETE /admin/mappings/bus-route/:busId ─────────────
export const unassignBusFromRoute = async (req, res, next) => {
  try {
    const bus = await prisma.bus.findUnique({ where: { id: req.params.busId } });
    if (!bus) throw new AppError('Bus not found', 404);

    await prisma.bus.update({
      where: { id: bus.id },
      data: { routeId: null },
    });

    res.json({ message: `Bus ${bus.plateNumber} unassigned from route.` });
  } catch (err) {
    next(err);
  }
};

// ─── DELETE /admin/mappings/bus-driver/:busId ────────────
export const unassignDriverFromBus = async (req, res, next) => {
  try {
    const bus = await prisma.bus.findUnique({ where: { id: req.params.busId } });
    if (!bus) throw new AppError('Bus not found', 404);

    await prisma.bus.update({
      where: { id: bus.id },
      data: { driverId: null },
    });

    res.json({ message: `Driver unassigned from bus ${bus.plateNumber}.` });
  } catch (err) {
    next(err);
  }
};

// ═══════════════════════════════════════════════════════════
//  STOPS (for route management forms)
// ═══════════════════════════════════════════════════════════

// ─── GET /admin/stops ───────────────────────────────────
export const listStops = async (req, res, next) => {
  try {
    const stops = await prisma.stop.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, name: true, city: true, lat: true, lng: true, amenities: true },
    });
    res.json(stops);
  } catch (err) {
    next(err);
  }
};

// ─── POST /admin/stops ──────────────────────────────────
export const createStop = async (req, res, next) => {
  try {
    const { name, city, lat, lng, amenities } = req.body;

    const stop = await prisma.stop.create({
      data: {
        name,
        city: city || 'Raipur',
        lat: parseFloat(lat),
        lng: parseFloat(lng),
        amenities: amenities || [],
      },
    });

    res.status(201).json({
      stopId: stop.id,
      name: stop.name,
      message: 'Stop created successfully.',
    });
  } catch (err) {
    next(err);
  }
};

// ─── GET /admin/stops/:stopId ───────────────────────────
export const getStop = async (req, res, next) => {
  try {
    const stop = await prisma.stop.findUnique({
      where: { id: req.params.stopId },
    });

    if (!stop) throw new AppError('Stop not found', 404);

    res.json({
      stopId: stop.id,
      name: stop.name,
      city: stop.city,
      lat: stop.lat,
      lng: stop.lng,
      amenities: stop.amenities,
    });
  } catch (err) {
    next(err);
  }
};

// ─── PUT /admin/stops/:stopId ───────────────────────────
export const updateStop = async (req, res, next) => {
  try {
    const { name, city, lat, lng, amenities } = req.body;

    const stop = await prisma.stop.findUnique({ where: { id: req.params.stopId } });
    if (!stop) throw new AppError('Stop not found', 404);

    const data = {};
    if (name !== undefined) data.name = name;
    if (city !== undefined) data.city = city;
    if (lat !== undefined) data.lat = parseFloat(lat);
    if (lng !== undefined) data.lng = parseFloat(lng);
    if (amenities !== undefined) data.amenities = amenities;

    const updated = await prisma.stop.update({
      where: { id: req.params.stopId },
      data,
    });

    res.json({
      stopId: updated.id,
      name: updated.name,
      message: 'Stop updated successfully.',
    });
  } catch (err) {
    next(err);
  }
};

// ─── DELETE /admin/stops/:stopId ────────────────────────
export const deleteStop = async (req, res, next) => {
  try {
    const stop = await prisma.stop.findUnique({ where: { id: req.params.stopId } });
    if (!stop) throw new AppError('Stop not found', 404);

    // Clean up related records before deleting the stop
    await prisma.schedule.deleteMany({ where: { stopId: stop.id } });
    await prisma.routeStop.deleteMany({ where: { stopId: stop.id } });
    await prisma.stop.delete({ where: { id: stop.id } });

    res.json({ message: 'Stop deleted successfully.' });
  } catch (err) {
    next(err);
  }
};

// ─── Dashboard stats ────────────────────────────────────
export const getDashboardStats = async (req, res, next) => {
  try {
    const [totalBuses, activeBuses, totalDrivers, totalRoutes, activeRoutes] = await Promise.all([
      prisma.bus.count(),
      prisma.bus.count({ where: { status: 'active' } }),
      prisma.user.count({ where: { role: 'driver', accountStatus: 'active' } }),
      prisma.route.count(),
    ]);

    res.json({
      totalBuses,
      activeBuses,
      totalDrivers,
      totalRoutes,
    });
  } catch (err) {
    next(err);
  }
};
