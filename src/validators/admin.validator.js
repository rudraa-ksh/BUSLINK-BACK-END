import { body } from 'express-validator';

export const createBusRules = [
  body('plateNumber')
    .trim()
    .notEmpty()
    .withMessage('Plate number is required'),
  body('type')
    .optional()
    .isIn(['AC', 'Non-AC'])
    .withMessage('Type must be AC or Non-AC'),
  body('capacity')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Capacity must be a positive integer'),
  body('odometer')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Odometer must be a non-negative number'),
];

export const createDriverRules = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('A valid email is required'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters'),
];

export const createRouteRules = [
  body('name').trim().notEmpty().withMessage('Route name is required'),
  body('city').optional().trim(),
  body('distanceKm')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Distance must be a non-negative number'),
];

export const assignBusRouteRules = [
  body('busId').trim().notEmpty().withMessage('Bus ID is required'),
  body('routeId').trim().notEmpty().withMessage('Route ID is required'),
];

export const assignBusDriverRules = [
  body('busId').trim().notEmpty().withMessage('Bus ID is required'),
  body('driverId').trim().notEmpty().withMessage('Driver ID is required'),
];
