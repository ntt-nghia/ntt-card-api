const { auth } = require('../config/firebase');
const { AppError } = require('../utils/errorHandler');
const logger = require('../utils/logger');

const authenticateUser = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('No token provided', 401);
    }

    const token = authHeader.split(' ')[1];
    const decodedToken = await auth.verifyIdToken(token);

    req.user = decodedToken;
    next();
  } catch (error) {
    logger.error('Authentication error:', error);

    if (error.code === 'auth/id-token-expired') {
      return next(new AppError('Token expired', 401));
    }

    if (error.code === 'auth/invalid-id-token') {
      return next(new AppError('Invalid token', 401));
    }

    next(new AppError('Authentication failed', 401));
  }
};

const requireAdmin = async (req, res, next) => {
  try {
    if (!req.user) {
      throw new AppError('Authentication required', 401);
    }

    // Check custom claims for admin role
    const userRecord = await auth.getUser(req.user.uid);
    if (!userRecord.customClaims?.admin) {
      throw new AppError('Admin access required', 403);
    }

    next();
  } catch (error) {
    logger.error('Admin authorization error:', error);
    next(new AppError('Admin access required', 403));
  }
};

const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const decodedToken = await auth.verifyIdToken(token);
      req.user = decodedToken;
    }

    next();
  } catch (error) {
    // Continue without authentication for optional auth
    next();
  }
};

module.exports = {
  authenticateUser,
  requireAdmin,
  optionalAuth
};