import rateLimit from 'express-rate-limit';

/**
 * General rate limiter: 200 requests/min/user.
 */
export const generalLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 200,
  keyGenerator: (req) => req.user?.userId || 'anonymous',
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 'error',
    code: 429,
    message: 'Too many requests. Please try again later.',
    details: {},
  },
});

/**
 * OTP rate limiter: max 5 requests/email/hour.
 */
export const otpLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  keyGenerator: (req) => req.body?.email || 'anonymous',
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 'error',
    code: 429,
    message: 'Too many OTP requests. Please try again later.',
    details: {},
  },
});

/**
 * Login rate limiter: max 10 failed attempts/IP/15 min.
 * Uses default keyGenerator (req.ip) — no custom generator needed.
 */
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 'error',
    code: 429,
    message: 'Too many login attempts. Please try again later.',
    details: {},
  },
});

/**
 * Driver location rate limiter: max 1 request/5s/driver.
 */
export const driverLocationLimiter = rateLimit({
  windowMs: 5 * 1000,
  max: 1,
  keyGenerator: (req) => req.user?.userId || 'anonymous',
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 'error',
    code: 429,
    message: 'Location updates limited to once every 5 seconds.',
    details: {},
  },
});
