import { Router } from 'express';
import * as ctrl from '../controllers/auth.controller.js';
import validate from '../middleware/validate.js';
import { authenticate } from '../middleware/auth.js';
import { otpLimiter, loginLimiter } from '../middleware/rateLimiter.js';
import {
  registerValidation,
  loginValidation,
  verifyOtpValidation,
  resendOtpValidation,
  forgotPasswordValidation,
  resetPasswordValidation,
  refreshTokenValidation,
  googleAuthValidation,
} from '../validators/auth.validator.js';

const router = Router();

router.post('/register', registerValidation, validate, ctrl.register);
router.post('/verify-otp', otpLimiter, verifyOtpValidation, validate, ctrl.verifyOtp);
router.post('/resend-otp', otpLimiter, resendOtpValidation, validate, ctrl.resendOtp);
router.post('/login', loginLimiter, loginValidation, validate, ctrl.login);
router.post('/google', googleAuthValidation, validate, ctrl.googleAuth);
router.post('/forgot-password', forgotPasswordValidation, validate, ctrl.forgotPassword);
router.post('/reset-password', resetPasswordValidation, validate, ctrl.resetPassword);
router.post('/refresh-token', refreshTokenValidation, validate, ctrl.refreshTokenHandler);
router.post('/logout', authenticate, ctrl.logout);

export default router;
