import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { OAuth2Client } from 'google-auth-library';
import prisma from '../config/db.js';
import AppError from '../utils/AppError.js';
import { generateAccessToken, generateRefreshToken, verifyToken } from '../utils/token.js';
import { generateOTP, sendOTPEmail } from '../utils/otp.js';

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// ─── POST /auth/register ────────────────────────────────
export const register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new AppError('An account with this email already exists', 409);
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const otp = generateOTP();
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 min

    const user = await prisma.user.create({
      data: {
        name,
        email,
        hashedPassword,
        otp,
        otpExpiresAt,
        role: 'passenger',
        accountStatus: 'pending',
      },
    });

    // Send OTP email (non-blocking — we don't fail registration if email fails)
    sendOTPEmail(email, otp).catch((err) =>
      console.error('Failed to send OTP email:', err.message)
    );

    res.status(201).json({
      userId: user.id,
      email: user.email,
      message: 'Registration successful. Please verify your email with the OTP sent.',
    });
  } catch (err) {
    next(err);
  }
};

// ─── POST /auth/verify-otp ──────────────────────────────
export const verifyOtp = async (req, res, next) => {
  try {
    const { email, otp } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new AppError('No account found with this email', 404);
    }

    if (user.accountStatus === 'active') {
      throw new AppError('Account is already verified', 400);
    }

    if (!user.otp || !user.otpExpiresAt) {
      throw new AppError('No OTP was generated. Please request a new one.', 400);
    }

    if (new Date() > user.otpExpiresAt) {
      throw new AppError('OTP has expired. Please request a new one.', 410);
    }

    if (user.otp !== otp) {
      throw new AppError('Invalid OTP', 400);
    }

    // Activate account & clear OTP
    const updatedUser = await prisma.user.update({
      where: { email },
      data: {
        accountStatus: 'active',
        otp: null,
        otpExpiresAt: null,
      },
    });

    const accessToken = generateAccessToken(updatedUser);
    const refreshToken = generateRefreshToken(updatedUser);

    // Store refresh token
    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: updatedUser.id,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    res.json({
      accessToken,
      refreshToken,
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ─── POST /auth/resend-otp ──────────────────────────────
export const resendOtp = async (req, res, next) => {
  try {
    const { email } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new AppError('No account found with this email', 404);
    }

    if (user.accountStatus === 'active') {
      throw new AppError('Account is already verified', 400);
    }

    const otp = generateOTP();
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await prisma.user.update({
      where: { email },
      data: { otp, otpExpiresAt },
    });

    sendOTPEmail(email, otp).catch((err) =>
      console.error('Failed to send OTP email:', err.message)
    );

    res.json({ message: 'A new OTP has been sent to your email.' });
  } catch (err) {
    next(err);
  }
};

// ─── POST /auth/login ───────────────────────────────────
export const login = async (req, res, next) => {
  try {
    const { email, password, role } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.hashedPassword) {
      throw new AppError('Invalid email or password', 401);
    }

    // If a specific role is requested, verify it
    if (role && user.role !== role) {
      throw new AppError('Invalid email or password', 401);
    }

    if (user.accountStatus === 'pending') {
      throw new AppError(
        'Account not verified. Please verify your email first.',
        403
      );
    }

    if (user.accountStatus === 'suspended' || user.accountStatus === 'deleted') {
      throw new AppError('Account is no longer active', 403);
    }

    const isMatch = await bcrypt.compare(password, user.hashedPassword);
    if (!isMatch) {
      throw new AppError('Invalid email or password', 401);
    }

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    res.json({
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ─── POST /auth/google ──────────────────────────────────
export const googleAuth = async (req, res, next) => {
  try {
    const { idToken } = req.body;

    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    const { sub: googleId, email, name, picture } = payload;

    let user = await prisma.user.findUnique({ where: { googleId } });
    let isNewUser = false;

    if (!user) {
      // Check if email already exists (non-Google account)
      const existingByEmail = await prisma.user.findUnique({ where: { email } });
      if (existingByEmail) {
        // Link Google ID to existing account
        user = await prisma.user.update({
          where: { email },
          data: {
            googleId,
            avatarUrl: existingByEmail.avatarUrl || picture,
            accountStatus: 'active',
          },
        });
      } else {
        user = await prisma.user.create({
          data: {
            name,
            email,
            googleId,
            avatarUrl: picture,
            role: 'passenger',
            accountStatus: 'active',
          },
        });
        isNewUser = true;
      }
    }

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    res.json({
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      isNewUser,
    });
  } catch (err) {
    next(err);
  }
};

// ─── POST /auth/forgot-password ─────────────────────────
export const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });

    // Always return success to avoid email enumeration
    if (!user) {
      return res.json({
        message: 'If that email exists, a password reset link has been sent.',
      });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 min

    await prisma.user.update({
      where: { email },
      data: { resetToken, resetTokenExpiry },
    });

    // In production, send an email with the reset link
    // For now, the token is stored and can be used via the reset-password endpoint
    console.log(`[DEV] Password reset token for ${email}: ${resetToken}`);

    res.json({
      message: 'If that email exists, a password reset link has been sent.',
    });
  } catch (err) {
    next(err);
  }
};

// ─── POST /auth/reset-password ──────────────────────────
export const resetPassword = async (req, res, next) => {
  try {
    const { email, resetToken, newPassword } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new AppError('Invalid or expired reset token', 400);
    }

    if (!user.resetToken || user.resetToken !== resetToken) {
      throw new AppError('Invalid or expired reset token', 400);
    }

    if (new Date() > user.resetTokenExpiry) {
      throw new AppError('Reset token has expired. Please request a new one.', 410);
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);

    await prisma.user.update({
      where: { email },
      data: {
        hashedPassword,
        resetToken: null,
        resetTokenExpiry: null,
      },
    });

    res.json({ message: 'Password has been reset successfully.' });
  } catch (err) {
    next(err);
  }
};

// ─── POST /auth/refresh-token ───────────────────────────
export const refreshTokenHandler = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    // Verify the token signature
    let decoded;
    try {
      decoded = verifyToken(refreshToken, process.env.JWT_REFRESH_SECRET);
    } catch {
      throw new AppError('Invalid or expired refresh token', 401);
    }

    // Check if token exists in DB
    const storedToken = await prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true },
    });

    if (!storedToken) {
      throw new AppError('Refresh token not found or already revoked', 401);
    }

    if (new Date() > storedToken.expiresAt) {
      await prisma.refreshToken.delete({ where: { id: storedToken.id } });
      throw new AppError('Refresh token has expired', 401);
    }

    // Rotate: delete old, issue new
    await prisma.refreshToken.delete({ where: { id: storedToken.id } });

    const newAccessToken = generateAccessToken(storedToken.user);
    const newRefreshToken = generateRefreshToken(storedToken.user);

    await prisma.refreshToken.create({
      data: {
        token: newRefreshToken,
        userId: storedToken.user.id,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    res.json({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    });
  } catch (err) {
    next(err);
  }
};

// ─── POST /auth/logout ──────────────────────────────────
export const logout = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (refreshToken) {
      await prisma.refreshToken
        .delete({ where: { token: refreshToken } })
        .catch(() => {}); // Ignore if already deleted
    }

    res.json({ message: 'Logged out successfully.' });
  } catch (err) {
    next(err);
  }
};
