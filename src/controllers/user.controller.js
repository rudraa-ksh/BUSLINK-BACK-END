const bcrypt = require('bcryptjs');
const prisma = require('../config/db');
const AppError = require('../utils/AppError');

// ─── GET /users/me ──────────────────────────────────────
exports.getProfile = async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        avatarUrl: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    res.json(user);
  } catch (err) {
    next(err);
  }
};

// ─── PUT /users/me ──────────────────────────────────────
exports.updateProfile = async (req, res, next) => {
  try {
    const { name, email } = req.body;
    const data = {};
    if (name !== undefined) data.name = name;
    if (email !== undefined) {
      // Check uniqueness
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing && existing.id !== req.user.userId) {
        throw new AppError('Email is already in use', 409);
      }
      data.email = email;
    }

    const user = await prisma.user.update({
      where: { id: req.user.userId },
      data,
      select: { id: true, name: true, email: true },
    });

    res.json(user);
  } catch (err) {
    next(err);
  }
};

// ─── PUT /users/me/password ─────────────────────────────
exports.changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
    });

    if (!user || !user.hashedPassword) {
      throw new AppError('Cannot change password for OAuth-only accounts', 400);
    }

    const isMatch = await bcrypt.compare(currentPassword, user.hashedPassword);
    if (!isMatch) {
      throw new AppError('Current password is incorrect', 401);
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);

    await prisma.user.update({
      where: { id: req.user.userId },
      data: { hashedPassword },
    });

    res.json({ message: 'Password updated successfully.' });
  } catch (err) {
    next(err);
  }
};

// ─── DELETE /users/me ───────────────────────────────────
exports.deleteAccount = async (req, res, next) => {
  try {
    // Soft-delete: mark account as deleted
    await prisma.user.update({
      where: { id: req.user.userId },
      data: { accountStatus: 'deleted' },
    });

    // Revoke all refresh tokens
    await prisma.refreshToken.deleteMany({
      where: { userId: req.user.userId },
    });

    res.json({ message: 'Account deleted successfully.' });
  } catch (err) {
    next(err);
  }
};

// ─── GET /users/me/recents ──────────────────────────────
exports.getRecents = async (req, res, next) => {
  try {
    const { type, limit } = req.query;
    const where = { userId: req.user.userId };
    if (type) where.type = type;

    const recents = await prisma.recentEntry.findMany({
      where,
      take: limit ? parseInt(limit) : 10,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        type: true,
        label: true,
        subLabel: true,
        lat: true,
        lng: true,
        originId: true,
        destId: true,
      },
    });

    res.json(recents);
  } catch (err) {
    next(err);
  }
};

// ─── POST /users/me/recents ─────────────────────────────
exports.createRecent = async (req, res, next) => {
  try {
    const { type, label, subLabel, lat, lng, originId, destId } = req.body;

    const recent = await prisma.recentEntry.create({
      data: {
        userId: req.user.userId,
        type,
        label,
        subLabel,
        lat,
        lng,
        originId,
        destId,
      },
      select: { id: true, type: true, label: true },
    });

    res.status(201).json(recent);
  } catch (err) {
    next(err);
  }
};

// ─── DELETE /users/me/recents/:recentId ─────────────────
exports.deleteRecent = async (req, res, next) => {
  try {
    const { recentId } = req.params;

    const recent = await prisma.recentEntry.findUnique({
      where: { id: recentId },
    });

    if (!recent || recent.userId !== req.user.userId) {
      throw new AppError('Recent entry not found', 404);
    }

    await prisma.recentEntry.delete({ where: { id: recentId } });

    res.json({ message: 'Recent entry removed.' });
  } catch (err) {
    next(err);
  }
};
