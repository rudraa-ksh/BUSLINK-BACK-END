import prisma from '../config/db.js';
import AppError from '../utils/AppError.js';

// ─── GET /buses/:busId/schedule ─────────────────────────
export const getSchedule = async (req, res, next) => {
  try {
    const { busId } = req.params;

    const bus = await prisma.bus.findUnique({ where: { id: busId } });
    if (!bus) {
      throw new AppError('Bus not found', 404);
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const schedules = await prisma.schedule.findMany({
      where: {
        busId,
        date: { gte: today },
      },
      include: {
        stop: {
          select: { id: true, name: true },
        },
      },
      orderBy: { scheduledArrival: 'asc' },
    });

    // Find corresponding route stops for distance info
    let distanceMap = {};
    if (bus.routeId) {
      const routeStops = await prisma.routeStop.findMany({
        where: { routeId: bus.routeId },
        select: { stopId: true, distanceFromOrigin: true },
      });
      distanceMap = Object.fromEntries(
        routeStops.map((rs) => [rs.stopId, rs.distanceFromOrigin])
      );
    }

    res.json({
      busId,
      status: bus.status,
      stops: schedules.map((s) => ({
        stopId: s.stop.id,
        name: s.stop.name,
        distanceFromOrigin: distanceMap[s.stopId] || 0,
        scheduledArrival: s.scheduledArrival,
        estimatedArrival: s.estimatedArrival,
        delayMinutes: s.delayMinutes,
        isCurrent: s.isCurrent,
      })),
    });
  } catch (err) {
    next(err);
  }
};

// ─── GET /buses/:busId/schedule/next-stop ───────────────
export const getNextStop = async (req, res, next) => {
  try {
    const { busId } = req.params;

    const bus = await prisma.bus.findUnique({ where: { id: busId } });
    if (!bus) {
      throw new AppError('Bus not found', 404);
    }

    // Find the current stop, then the next one
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const schedules = await prisma.schedule.findMany({
      where: {
        busId,
        date: { gte: today },
      },
      include: {
        stop: { select: { id: true, name: true } },
      },
      orderBy: { scheduledArrival: 'asc' },
    });

    // Find the first stop after the current one
    let foundCurrent = false;
    let nextStop = null;

    for (const s of schedules) {
      if (s.isCurrent) {
        foundCurrent = true;
        continue;
      }
      if (foundCurrent) {
        nextStop = s;
        break;
      }
    }

    // If no current stop found, return the first upcoming stop
    if (!nextStop && schedules.length > 0) {
      nextStop = schedules.find((s) => !s.actualArrival) || schedules[0];
    }

    if (!nextStop) {
      throw new AppError('No upcoming stops found', 404);
    }

    res.json({
      stopId: nextStop.stop.id,
      stopName: nextStop.stop.name,
      eta: nextStop.estimatedArrival || nextStop.scheduledArrival,
      delayMinutes: nextStop.delayMinutes,
      status: nextStop.delayMinutes > 0 ? 'Delayed' : 'On Time',
    });
  } catch (err) {
    next(err);
  }
};
