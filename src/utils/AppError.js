/**
 * Custom application error class.
 * Extends built-in Error with HTTP status code and details.
 */
export default class AppError extends Error {
  constructor(message, statusCode, details = {}) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}
