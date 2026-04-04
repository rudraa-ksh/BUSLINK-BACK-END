import AppError from '../utils/AppError.js';

/**
 * Global error handler middleware.
 * Returns standardised { status, code, message, details } JSON.
 */
export default function errorHandler(err, req, res, _next) {
  // Default values
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';
  let details = err.details || {};

  // Prisma known request errors
  if (err.code === 'P2002') {
    statusCode = 409;
    message = 'A record with that value already exists';
    details = { field: err.meta?.target };
  }
  if (err.code === 'P2025') {
    statusCode = 404;
    message = 'Resource not found';
  }

  // JWT errors (fallback — most are caught in auth middleware)
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
  }

  // Log non-operational / unexpected errors
  if (!err.isOperational) {
    console.error('💥 Unexpected error:', err);
  }

  res.status(statusCode).json({
    status: 'error',
    code: statusCode,
    message,
    details,
  });
}
