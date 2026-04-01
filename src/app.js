const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { generalLimiter } = require('./middleware/rateLimiter');
const errorHandler = require('./middleware/errorHandler');

// ─── Route imports ───────────────────────────────────────
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const busRoutes = require('./routes/bus.routes');
const scheduleRoutes = require('./routes/schedule.routes');
const stopRoutes = require('./routes/stop.routes');
const routeRoutes = require('./routes/route.routes');
const driverRoutes = require('./routes/driver.routes');
const geocodeRoutes = require('./routes/geocode.routes');

const app = express();

// ─── Global Middleware ───────────────────────────────────
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));
app.use(generalLimiter);

// ─── Health Check ────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({
    name: 'BusLink API',
    version: '1.0.0',
    status: 'running',
    timestamp: new Date().toISOString(),
  });
});

// ─── API Routes ──────────────────────────────────────────
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/buses', busRoutes);
app.use('/api/v1/buses/:busId/schedule', scheduleRoutes);
app.use('/api/v1/stops', stopRoutes);
app.use('/api/v1/routes', routeRoutes);
app.use('/api/v1/driver', driverRoutes);
app.use('/api/v1', geocodeRoutes); // /geocode/* and /navigation/*

// ─── 404 Handler ─────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    status: 'error',
    code: 404,
    message: `Route ${req.method} ${req.originalUrl} not found`,
    details: {},
  });
});

// ─── Global Error Handler ────────────────────────────────
app.use(errorHandler);

module.exports = app;
