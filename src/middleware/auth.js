const { verifyToken } = require('../utils/token');
const AppError = require('../utils/AppError');

/**
 * Middleware: verify JWT access token from Authorization header.
 * Attaches `req.user` = { userId, email, role }.
 */
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new AppError('Missing or invalid authorization token', 401));
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = verifyToken(token, process.env.JWT_SECRET);
    req.user = {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role,
    };
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return next(new AppError('Access token has expired', 401));
    }
    return next(new AppError('Invalid access token', 401));
  }
}

/**
 * Middleware factory: restrict access to specific roles.
 * Usage: authorize('driver'), authorize('admin', 'driver')
 */
function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError('Authentication required', 401));
    }
    if (!roles.includes(req.user.role)) {
      return next(new AppError('You do not have permission to access this resource', 403));
    }
    next();
  };
}

module.exports = { authenticate, authorize };
