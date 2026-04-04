import jwt from 'jsonwebtoken';

/**
 * Generate a short-lived access token (60 min default).
 */
export function generateAccessToken(user) {
  return jwt.sign(
    { userId: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_ACCESS_EXPIRY || '60m' }
  );
}

/**
 * Generate a long-lived refresh token (30 days default).
 */
export function generateRefreshToken(user) {
  return jwt.sign(
    { userId: user.id },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRY || '30d' }
  );
}

/**
 * Verify and decode a JWT.
 */
export function verifyToken(token, secret) {
  return jwt.verify(token, secret);
}
