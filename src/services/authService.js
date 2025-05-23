const { auth } = require('../config/firebase');
const UserService = require('./userService');
const { createUserData } = require('../models/User');
const { AppError } = require('../utils/errorHandler');
const logger = require('../utils/logger');

class AuthService {
  constructor() {
    this.userService = new UserService();
  }

  async registerUser(userData) {
    try {
      // Create Firebase user first
      const firebaseUser = await auth.createUser({
        email: userData.email,
        password: userData.password,
        displayName: userData.displayName,
        emailVerified: false
      });

      logger.info(`Firebase user created with UID: ${firebaseUser.uid}`);

      // Create user profile data with proper structure
      const userProfileData = createUserData(firebaseUser, {
        birthDate: userData.birthDate,
        avatar: userData.avatar || ''
      });

      logger.info('User profile data created:', {
        uid: userProfileData.uid,
        email: userProfileData.email,
        displayName: userProfileData.displayName
      });

      // Save user profile in Firestore
      const user = await this.userService.createUser(userProfileData);

      // Generate custom token for immediate login
      const customToken = await auth.createCustomToken(firebaseUser.uid);

      return {
        user,
        token: customToken,
        message: 'User registered successfully'
      };
    } catch (error) {
      logger.error('Registration error:', error);

      // If Firestore creation fails, clean up Firebase user
      if (error.message.includes('Validation error') && error.statusCode === 400) {
        try {
          await auth.deleteUser(firebaseUser?.uid);
          logger.info('Cleaned up Firebase user after validation failure');
        } catch (cleanupError) {
          logger.error('Failed to cleanup Firebase user:', cleanupError);
        }
      }

      if (error.code === 'auth/email-already-exists') {
        throw new AppError('Email already registered', 409);
      }

      if (error.code === 'auth/weak-password') {
        throw new AppError('Password is too weak', 400);
      }

      // Re-throw AppError as-is, wrap others
      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError('Registration failed', 500);
    }
  }

  async verifyToken(idToken) {
    try {
      const decodedToken = await auth.verifyIdToken(idToken);
      return decodedToken;
    } catch (error) {
      logger.error('Token verification error:', error);
      throw new AppError('Invalid token', 401);
    }
  }

  async getUserFromToken(idToken) {
    const decodedToken = await this.verifyToken(idToken);
    const user = await this.userService.getUserById(decodedToken.uid);

    // Update last login
    await this.userService.updateLastLogin(decodedToken.uid);

    return user;
  }

  async refreshToken(uid) {
    try {
      const customToken = await auth.createCustomToken(uid);
      return customToken;
    } catch (error) {
      logger.error('Token refresh error:', error);
      throw new AppError('Failed to refresh token', 500);
    }
  }

  async resetPassword(email) {
    try {
      await auth.generatePasswordResetLink(email);
      return { message: 'Password reset email sent' };
    } catch (error) {
      logger.error('Password reset error:', error);

      if (error.code === 'auth/user-not-found') {
        throw new AppError('No user found with this email', 404);
      }

      throw new AppError('Failed to send password reset email', 500);
    }
  }

  async setAdminClaim(uid) {
    try {
      await auth.setCustomUserClaims(uid, { admin: true });
      return { message: 'Admin privileges granted' };
    } catch (error) {
      logger.error('Set admin claim error:', error);
      throw new AppError('Failed to set admin privileges', 500);
    }
  }

  async revokeAdminClaim(uid) {
    try {
      await auth.setCustomUserClaims(uid, { admin: false });
      return { message: 'Admin privileges revoked' };
    } catch (error) {
      logger.error('Revoke admin claim error:', error);
      throw new AppError('Failed to revoke admin privileges', 500);
    }
  }

  async deleteUser(uid) {
    try {
      // Delete from Firebase Auth
      await auth.deleteUser(uid);

      // Delete from Firestore
      await this.userService.deleteUser(uid);

      return { message: 'User deleted successfully' };
    } catch (error) {
      logger.error('Delete user error:', error);
      throw new AppError('Failed to delete user', 500);
    }
  }
}

module.exports = AuthService;