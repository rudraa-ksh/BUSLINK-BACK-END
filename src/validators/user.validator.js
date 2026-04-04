import { body } from 'express-validator';

export const updateProfileValidation = [
  body('name').optional().trim().notEmpty().withMessage('Name cannot be empty'),
  body('email').optional().isEmail().normalizeEmail().withMessage('A valid email is required'),
];

export const changePasswordValidation = [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('New password must be at least 8 characters'),
  body('confirmPassword')
    .custom((value, { req }) => value === req.body.newPassword)
    .withMessage('Passwords do not match'),
];

export const createRecentValidation = [
  body('type').isIn(['location', 'route']).withMessage('Type must be "location" or "route"'),
  body('label').trim().notEmpty().withMessage('Label is required'),
  body('subLabel').optional().trim(),
  body('lat').optional().isFloat().withMessage('Latitude must be a number'),
  body('lng').optional().isFloat().withMessage('Longitude must be a number'),
  body('originId').optional().trim(),
  body('destId').optional().trim(),
];
