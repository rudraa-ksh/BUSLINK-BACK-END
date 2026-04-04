import { body } from 'express-validator';

export const registerValidation = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().normalizeEmail().withMessage('A valid email is required'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters'),
  body('confirmPassword')
    .custom((value, { req }) => value === req.body.password)
    .withMessage('Passwords do not match'),
];

export const loginValidation = [
  body('email').isEmail().normalizeEmail().withMessage('A valid email is required'),
  body('password').notEmpty().withMessage('Password is required'),
];

export const verifyOtpValidation = [
  body('email').isEmail().normalizeEmail().withMessage('A valid email is required'),
  body('otp')
    .isLength({ min: 4, max: 4 })
    .isNumeric()
    .withMessage('OTP must be a 4-digit number'),
];

export const resendOtpValidation = [
  body('email').isEmail().normalizeEmail().withMessage('A valid email is required'),
];

export const forgotPasswordValidation = [
  body('email').isEmail().normalizeEmail().withMessage('A valid email is required'),
];

export const resetPasswordValidation = [
  body('email').isEmail().normalizeEmail().withMessage('A valid email is required'),
  body('resetToken').notEmpty().withMessage('Reset token is required'),
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters'),
  body('confirmPassword')
    .custom((value, { req }) => value === req.body.newPassword)
    .withMessage('Passwords do not match'),
];

export const refreshTokenValidation = [
  body('refreshToken').notEmpty().withMessage('Refresh token is required'),
];

export const googleAuthValidation = [
  body('idToken').notEmpty().withMessage('Google ID token is required'),
];
