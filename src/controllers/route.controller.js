const prisma = require('../config/db');
const AppError = require('../utils/AppError');

// ─── GET /routes ────────────────────────────────────────
exports.listRoutes = async (req, res, next) => {
  try {
    const { city, active } = req.query;
    const where = {};
    if (city) where.city = city;
    // Default to active routes unless explicitly set to false
    where.active = active === 'false' ? false : true;

    const routes = await prisma.route.findMany({
      where,
      include: {
        routeStops: {
          orderBy: { sequence: 'asc' },
          include: {
            stop: { select: { name: true } },
          },
        },
      },
    });

    res.json(
      routes.map((r) => {
        const stops = r.routeStops;
        return {
          routeId: r.id,
          name: r.name,
          originStop: stops[0]?.stop.name || null,
          terminalStop: stops[stops.length - 1]?.stop.name || null,
          totalStops: stops.length,
          distanceKm: r.distanceKm,
        };
      })
    );
  } catch (err) {
    next(err);
  }
};

// ─── GET /routes/:routeId ───────────────────────────────
exports.getRouteDetails = async (req, res, next) => {
  try {
    const route = await prisma.route.findUnique({
      where: { id: req.params.routeId },
      include: {
        routeStops: {
          orderBy: { sequence: 'asc' },
          include: {
            stop: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!route) {
      throw new AppError('Route not found', 404);
    }

    res.json({
      routeId: route.id,
      name: route.name,
      stops: route.routeStops.map((rs) => ({
        sequence: rs.sequence,
        stopId: rs.stop.id,
        name: rs.stop.name,
        distanceFromOrigin: rs.distanceFromOrigin,
      })),
    });
  } catch (err) {
    next(err);
  }
};
