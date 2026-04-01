const { Router } = require('express');
const ctrl = require('../controllers/auth.controller');
const validate = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const { otpLimiter, loginLimiter } = require('../middleware/rateLimiter');
const {
  registerValidation,
  loginValidation,
  verifyOtpValidation,
  resendOtpValidation,
  forgotPasswordValidation,
  resetPasswordValidation,
  refreshTokenValidation,
  googleAuthValidation,
} = require('../validators/auth.validator');

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

module.exports = router;
