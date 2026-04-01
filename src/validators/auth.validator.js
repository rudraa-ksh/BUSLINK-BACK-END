const { body } = require('express-validator');

const registerValidation = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().normalizeEmail().withMessage('A valid email is required'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters'),
  body('confirmPassword')
    .custom((value, { req }) => value === req.body.password)
    .withMessage('Passwords do not match'),
];

const loginValidation = [
  body('email').isEmail().normalizeEmail().withMessage('A valid email is required'),
  body('password').notEmpty().withMessage('Password is required'),
];

const verifyOtpValidation = [
  body('email').isEmail().normalizeEmail().withMessage('A valid email is required'),
  body('otp')
    .isLength({ min: 4, max: 4 })
    .isNumeric()
    .withMessage('OTP must be a 4-digit number'),
];

const resendOtpValidation = [
  body('email').isEmail().normalizeEmail().withMessage('A valid email is required'),
];

const forgotPasswordValidation = [
  body('email').isEmail().normalizeEmail().withMessage('A valid email is required'),
];

const resetPasswordValidation = [
  body('email').isEmail().normalizeEmail().withMessage('A valid email is required'),
  body('resetToken').notEmpty().withMessage('Reset token is required'),
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters'),
  body('confirmPassword')
    .custom((value, { req }) => value === req.body.newPassword)
    .withMessage('Passwords do not match'),
];

const refreshTokenValidation = [
  body('refreshToken').notEmpty().withMessage('Refresh token is required'),
];

const googleAuthValidation = [
  body('idToken').notEmpty().withMessage('Google ID token is required'),
];

module.exports = {
  registerValidation,
  loginValidation,
  verifyOtpValidation,
  resendOtpValidation,
  forgotPasswordValidation,
  resetPasswordValidation,
  refreshTokenValidation,
  googleAuthValidation,
};
