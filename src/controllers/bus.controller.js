import prisma from '../config/db.js';
import AppError from '../utils/AppError.js';

// ─── GET /buses ─────────────────────────────────────────
export const listBuses = async (req, res, next) => {
  try {
    const { routeId, status } = req.query;
    const where = {};
    if (routeId) where.routeId = routeId;
    if (status && status !== 'all') where.status = status;

    const buses = await prisma.bus.findMany({
      where,
      select: {
        id: true,
        plateNumber: true,
        routeId: true,
        status: true,
        currentLat: true,
        currentLng: true,
      },
    });

    res.json(
      buses.map((b) => ({
        busId: b.id,
        plateNumber: b.plateNumber,
        routeId: b.routeId,
        status: b.status,
        currentLat: b.currentLat,
        currentLng: b.currentLng,
      }))
    );
  } catch (err) {
    next(err);
  }
};

// ─── GET /buses/:busId ──────────────────────────────────
export const getBusDetails = async (req, res, next) => {
  try {
    const bus = await prisma.bus.findUnique({
      where: { id: req.params.busId },
      select: {
        id: true,
        plateNumber: true,
        routeId: true,
        driverId: true,
        status: true,
        capacity: true,
      },
    });

    if (!bus) {
      throw new AppError('Bus not found', 404);
    }

    res.json({
      busId: bus.id,
      plateNumber: bus.plateNumber,
      routeId: bus.routeId,
      driverId: bus.driverId,
      status: bus.status,
      capacity: bus.capacity,
    });
  } catch (err) {
    next(err);
  }
};

// ─── GET /buses/:busId/location ─────────────────────────
export const getBusLocation = async (req, res, next) => {
  try {
    const bus = await prisma.bus.findUnique({
      where: { id: req.params.busId },
      select: {
        id: true,
        currentLat: true,
        currentLng: true,
        heading: true,
        speed: true,
        locationUpdatedAt: true,
      },
    });

    if (!bus) {
      throw new AppError('Bus not found', 404);
    }

    res.json({
      busId: bus.id,
      lat: bus.currentLat,
      lng: bus.currentLng,
      heading: bus.heading,
      speed: bus.speed,
      updatedAt: bus.locationUpdatedAt,
    });
  } catch (err) {
    next(err);
  }
};

// ─── GET /buses/nearby ──────────────────────────────────
export const getNearbyBuses = async (req, res, next) => {
  try {
    const { lat, lng, radius } = req.query;
    if (!lat || !lng) {
      throw new AppError('lat and lng query parameters are required', 400);
    }

    const userLat = parseFloat(lat);
    const userLng = parseFloat(lng);
    const radiusM = parseInt(radius) || 2000;

    // Approximate degrees for the bounding box
    const latDelta = radiusM / 111320;
    const lngDelta = radiusM / (111320 * Math.cos((userLat * Math.PI) / 180));

    const buses = await prisma.bus.findMany({
      where: {
        status: 'active',
        currentLat: { gte: userLat - latDelta, lte: userLat + latDelta },
        currentLng: { gte: userLng - lngDelta, lte: userLng + lngDelta },
      },
      select: {
        id: true,
        plateNumber: true,
        currentLat: true,
        currentLng: true,
        routeId: true,
      },
    });

    // Calculate Haversine distance and filter by radius
    const results = buses
      .map((b) => ({
        busId: b.id,
        plateNumber: b.plateNumber,
        lat: b.currentLat,
        lng: b.currentLng,
        routeId: b.routeId,
        distance: haversine(userLat, userLng, b.currentLat, b.currentLng),
      }))
      .filter((b) => b.distance <= radiusM)
      .sort((a, b) => a.distance - b.distance)
      .map((b) => ({
        busId: b.busId,
        plateNumber: b.plateNumber,
        lat: b.lat,
        lng: b.lng,
        routeId: b.routeId,
        eta: null, // ETA calculation requires routing engine
      }));

    res.json(results);
  } catch (err) {
    next(err);
  }
};

// ─── GET /buses/search ──────────────────────────────────
export const searchBuses = async (req, res, next) => {
  try {
    const { originStopId, destStopId, time } = req.query;
    if (!originStopId || !destStopId) {
      throw new AppError('originStopId and destStopId are required', 400);
    }

    // Find routes that contain both stops in the correct order
    const originStops = await prisma.routeStop.findMany({
      where: { stopId: originStopId },
      select: { routeId: true, sequence: true },
    });

    const destStops = await prisma.routeStop.findMany({
      where: { stopId: destStopId },
      select: { routeId: true, sequence: true },
    });

    // Routes where origin comes before destination
    const validRouteIds = [];
    for (const origin of originStops) {
      for (const dest of destStops) {
        if (origin.routeId === dest.routeId && origin.sequence < dest.sequence) {
          validRouteIds.push(origin.routeId);
        }
      }
    }

    if (validRouteIds.length === 0) {
      return res.json([]);
    }

    const buses = await prisma.bus.findMany({
      where: {
        routeId: { in: validRouteIds },
        status: 'active',
      },
      include: {
        route: { select: { name: true } },
      },
    });

    res.json(
      buses.map((b) => ({
        busId: b.id,
        plateNumber: b.plateNumber,
        routeName: b.route?.name,
        departureTime: null,
        eta: null,
        status: b.status,
      }))
    );
  } catch (err) {
    next(err);
  }
};

/**
 * Haversine formula to calculate distance in metres between two points.
 */
function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371000; // Earth's radius in metres
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
