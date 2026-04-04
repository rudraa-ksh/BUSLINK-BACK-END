import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { generalLimiter } from './middleware/rateLimiter.js';
import errorHandler from './middleware/errorHandler.js';

// ─── Route imports ───────────────────────────────────────
import authRoutes from './routes/auth.routes.js';
import userRoutes from './routes/user.routes.js';
import busRoutes from './routes/bus.routes.js';
import scheduleRoutes from './routes/schedule.routes.js';
import stopRoutes from './routes/stop.routes.js';
import routeRoutes from './routes/route.routes.js';
import driverRoutes from './routes/driver.routes.js';
import geocodeRoutes from './routes/geocode.routes.js';
import adminRoutes from './routes/admin.routes.js';

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
app.use('/api/v1/admin', adminRoutes);

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

export default app;
