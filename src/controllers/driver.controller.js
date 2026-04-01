const prisma = require('../config/db');
const AppError = require('../utils/AppError');

// ─── GET /driver/assignment ─────────────────────────────
exports.getAssignment = async (req, res, next) => {
  try {
    const bus = await prisma.bus.findUnique({
      where: { driverId: req.user.userId },
      include: {
        route: { select: { id: true, name: true } },
      },
    });

    if (!bus) {
      throw new AppError('No bus assignment found for today', 404);
    }

    res.json({
      busId: bus.id,
      plateNumber: bus.plateNumber,
      routeId: bus.route?.id || null,
      routeName: bus.route?.name || null,
      assignedDate: new Date().toISOString().split('T')[0],
    });
  } catch (err) {
    next(err);
  }
};

// ─── GET /driver/trips ──────────────────────────────────
exports.getTrips = async (req, res, next) => {
  try {
    const bus = await prisma.bus.findUnique({
      where: { driverId: req.user.userId },
    });

    if (!bus) {
      throw new AppError('No bus assignment found', 404);
    }

    const dateParam = req.query.date;
    const targetDate = dateParam ? new Date(dateParam) : new Date();
    targetDate.setHours(0, 0, 0, 0);

    const nextDay = new Date(targetDate);
    nextDay.setDate(nextDay.getDate() + 1);

    const trips = await prisma.trip.findMany({
      where: {
        busId: bus.id,
        date: { gte: targetDate, lt: nextDay },
      },
      orderBy: { departureTime: 'asc' },
    });

    res.json(
      trips.map((t) => ({
        tripId: t.id,
        tripNumber: t.tripNumber,
        originStop: t.originStop,
        destStop: t.destStop,
        distanceKm: t.distanceKm,
        departureTime: t.departureTime,
        status: t.status,
      }))
    );
  } catch (err) {
    next(err);
  }
};

// ─── GET /driver/trips/:tripId ──────────────────────────
exports.getTripDetails = async (req, res, next) => {
  try {
    const trip = await prisma.trip.findUnique({
      where: { id: req.params.tripId },
      include: {
        bus: {
          include: {
            schedules: {
              include: { stop: { select: { id: true, name: true } } },
              orderBy: { scheduledArrival: 'asc' },
            },
          },
        },
      },
    });

    if (!trip) {
      throw new AppError('Trip not found', 404);
    }

    res.json({
      tripId: trip.id,
      busId: trip.busId,
      status: trip.status,
      stops: trip.bus.schedules.map((s) => ({
        stopId: s.stop.id,
        name: s.stop.name,
        scheduledArrival: s.scheduledArrival,
        estimatedArrival: s.estimatedArrival,
        delayMinutes: s.delayMinutes,
        passengerCount: s.passengerCount,
        isCurrent: s.isCurrent,
      })),
    });
  } catch (err) {
    next(err);
  }
};

// ─── POST /driver/trips/:tripId/start ───────────────────
exports.startTrip = async (req, res, next) => {
  try {
    const trip = await prisma.trip.findUnique({
      where: { id: req.params.tripId },
    });

    if (!trip) {
      throw new AppError('Trip not found', 404);
    }

    if (trip.status !== 'scheduled') {
      throw new AppError(`Cannot start a trip with status "${trip.status}"`, 400);
    }

    const updated = await prisma.trip.update({
      where: { id: req.params.tripId },
      data: {
        status: 'in_progress',
        startedAt: new Date(),
      },
    });

    // Mark the bus as active
    await prisma.bus.update({
      where: { id: trip.busId },
      data: { status: 'active' },
    });

    res.json({
      tripId: updated.id,
      status: updated.status,
      startedAt: updated.startedAt,
    });
  } catch (err) {
    next(err);
  }
};

// ─── POST /driver/trips/:tripId/complete ────────────────
exports.completeTrip = async (req, res, next) => {
  try {
    const trip = await prisma.trip.findUnique({
      where: { id: req.params.tripId },
    });

    if (!trip) {
      throw new AppError('Trip not found', 404);
    }

    if (trip.status !== 'in_progress') {
      throw new AppError(
        `Cannot complete a trip with status "${trip.status}"`,
        400
      );
    }

    const updated = await prisma.trip.update({
      where: { id: req.params.tripId },
      data: {
        status: 'completed',
        completedAt: new Date(),
      },
    });

    // Check if there are more trips for this bus today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const nextDay = new Date(today);
    nextDay.setDate(nextDay.getDate() + 1);

    const remainingTrips = await prisma.trip.count({
      where: {
        busId: trip.busId,
        date: { gte: today, lt: nextDay },
        status: 'scheduled',
      },
    });

    // If no more trips, set bus to idle
    if (remainingTrips === 0) {
      await prisma.bus.update({
        where: { id: trip.busId },
        data: { status: 'idle' },
      });
    }

    res.json({
      tripId: updated.id,
      status: updated.status,
      completedAt: updated.completedAt,
    });
  } catch (err) {
    next(err);
  }
};

// ─── PUT /driver/location ───────────────────────────────
exports.updateLocation = async (req, res, next) => {
  try {
    const { lat, lng, heading, speed, timestamp } = req.body;

    if (lat === undefined || lng === undefined) {
      throw new AppError('lat and lng are required', 400);
    }

    const bus = await prisma.bus.findUnique({
      where: { driverId: req.user.userId },
    });

    if (!bus) {
      throw new AppError('No bus assignment found', 404);
    }

    await prisma.bus.update({
      where: { id: bus.id },
      data: {
        currentLat: parseFloat(lat),
        currentLng: parseFloat(lng),
        heading: heading ? parseFloat(heading) : null,
        speed: speed ? parseFloat(speed) : null,
        locationUpdatedAt: timestamp ? new Date(timestamp) : new Date(),
      },
    });

    res.json({ received: true });
  } catch (err) {
    next(err);
  }
};

// ─── GET /driver/schedule ───────────────────────────────
exports.getDriverSchedule = async (req, res, next) => {
  try {
    const bus = await prisma.bus.findUnique({
      where: { driverId: req.user.userId },
    });

    if (!bus) {
      throw new AppError('No bus assignment found', 404);
    }

    // Find the active trip
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const nextDay = new Date(today);
    nextDay.setDate(nextDay.getDate() + 1);

    const activeTrip = await prisma.trip.findFirst({
      where: {
        busId: bus.id,
        date: { gte: today, lt: nextDay },
        status: 'in_progress',
      },
    });

    const schedules = await prisma.schedule.findMany({
      where: {
        busId: bus.id,
        date: { gte: today, lt: nextDay },
      },
      include: {
        stop: { select: { id: true, name: true } },
      },
      orderBy: { scheduledArrival: 'asc' },
    });

    res.json({
      tripId: activeTrip?.id || null,
      busId: bus.id,
      status: bus.status,
      stops: schedules.map((s) => ({
        stopId: s.stop.id,
        name: s.stop.name,
        scheduledArrival: s.scheduledArrival,
        estimatedArrival: s.estimatedArrival,
        delayMinutes: s.delayMinutes,
        passengerCount: s.passengerCount,
        isCurrent: s.isCurrent,
      })),
    });
  } catch (err) {
    next(err);
  }
};
