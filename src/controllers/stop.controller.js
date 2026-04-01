const prisma = require('../config/db');
const AppError = require('../utils/AppError');

// ─── GET /stops ─────────────────────────────────────────
exports.listStops = async (req, res, next) => {
  try {
    const { routeId, city } = req.query;
    let where = {};
    if (city) where.city = city;

    let stops;

    if (routeId) {
      // Find stops belonging to a route via RouteStop join table
      const routeStops = await prisma.routeStop.findMany({
        where: { routeId },
        include: {
          stop: {
            select: { id: true, name: true, city: true, lat: true, lng: true },
          },
        },
        orderBy: { sequence: 'asc' },
      });

      stops = routeStops.map((rs) => ({
        stopId: rs.stop.id,
        name: rs.stop.name,
        city: rs.stop.city,
        lat: rs.stop.lat,
        lng: rs.stop.lng,
        routeIds: [routeId],
      }));
    } else {
      const rawStops = await prisma.stop.findMany({
        where,
        include: {
          routeStops: { select: { routeId: true } },
        },
      });

      stops = rawStops.map((s) => ({
        stopId: s.id,
        name: s.name,
        city: s.city,
        lat: s.lat,
        lng: s.lng,
        routeIds: s.routeStops.map((rs) => rs.routeId),
      }));
    }

    res.json(stops);
  } catch (err) {
    next(err);
  }
};

// ─── GET /stops/:stopId ─────────────────────────────────
exports.getStopDetails = async (req, res, next) => {
  try {
    const stop = await prisma.stop.findUnique({
      where: { id: req.params.stopId },
      include: {
        routeStops: { select: { routeId: true } },
      },
    });

    if (!stop) {
      throw new AppError('Stop not found', 404);
    }

    res.json({
      stopId: stop.id,
      name: stop.name,
      city: stop.city,
      lat: stop.lat,
      lng: stop.lng,
      routeIds: stop.routeStops.map((rs) => rs.routeId),
      amenities: stop.amenities,
    });
  } catch (err) {
    next(err);
  }
};

// ─── GET /stops/nearest ─────────────────────────────────
exports.getNearestStops = async (req, res, next) => {
  try {
    const { lat, lng, limit } = req.query;
    if (!lat || !lng) {
      throw new AppError('lat and lng query parameters are required', 400);
    }

    const userLat = parseFloat(lat);
    const userLng = parseFloat(lng);
    const maxResults = parseInt(limit) || 3;

    // Get all stops and compute distances (for small datasets)
    const allStops = await prisma.stop.findMany({
      select: { id: true, name: true, lat: true, lng: true },
    });

    const withDistances = allStops
      .map((s) => {
        const dist = haversine(userLat, userLng, s.lat, s.lng);
        return {
          stopId: s.id,
          name: s.name,
          distanceMetres: Math.round(dist),
          walkingMinutes: Math.round(dist / 80), // ~80 m/min walking
          lat: s.lat,
          lng: s.lng,
        };
      })
      .sort((a, b) => a.distanceMetres - b.distanceMetres)
      .slice(0, maxResults);

    res.json(withDistances);
  } catch (err) {
    next(err);
  }
};

// ─── GET /stops/search ──────────────────────────────────
exports.searchStops = async (req, res, next) => {
  try {
    const { q, limit } = req.query;
    if (!q) {
      throw new AppError('Query parameter "q" is required', 400);
    }

    const stops = await prisma.stop.findMany({
      where: {
        name: { contains: q, mode: 'insensitive' },
      },
      take: parseInt(limit) || 10,
      select: {
        id: true,
        name: true,
        city: true,
        lat: true,
        lng: true,
      },
    });

    res.json(
      stops.map((s) => ({
        stopId: s.id,
        name: s.name,
        city: s.city,
        lat: s.lat,
        lng: s.lng,
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
  const R = 6371000;
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
