// src/services/authService.js - Updated backend auth service
const { auth } = require('../config/firebase');
const UserService = require('./userService');
const { createUserData } = require('../models/User');
const { AppError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

class AuthService {
  constructor() {
    this.userService = new UserService();
  }

  async registerUser(userData) {
    let firebaseUser = null;

    try {
      // Create Firebase user
      firebaseUser = await auth.createUser({
        email: userData.email,
        password: userData.password,
        displayName: userData.displayName,
        emailVerified: false
      });

      logger.info(`Firebase user created: ${firebaseUser.uid}`);

      // Create user profile in Firestore
      const userProfileData = createUserData(firebaseUser, {
        birthDate: userData.birthDate,
        avatar: userData.avatar || '',
        language: userData.language || 'en'
      });

      const user = await this.userService.createUser(userProfileData);

      // Set custom claims for role-based access
      await auth.setCustomUserClaims(firebaseUser.uid, {
        role: userData.role || 'user',
        admin: userData.role === 'admin'
      });

      // Generate custom token for client authentication
      const customToken = await auth.createCustomToken(firebaseUser.uid, {
        role: userData.role || 'user',
        admin: userData.role === 'admin'
      });

      return {
        user,
        customToken,
        message: 'User registered successfully'
      };

    } catch (error) {
      // Cleanup Firebase user if profile creation fails
      if (firebaseUser) {
        try {
          await auth.deleteUser(firebaseUser.uid);
          logger.info('Cleaned up Firebase user after profile creation failure');
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

      if (error instanceof AppError) {
        throw error;
      }

      logger.error('Registration error:', error);
      throw new AppError('Registration failed', 500);
    }
  }

  async loginUser(credentials) {
    try {
      const { email, password } = credentials;

      if (!email || !password) {
        throw new AppError('Email and password are required', 400);
      }

      // Verify user exists in Firebase Auth
      const firebaseUser = await auth.getUserByEmail(email);

      if (!firebaseUser) {
        throw new AppError('Invalid email or password', 401);
      }

      // Get user profile from Firestore
      const user = await this.userService.getUserById(firebaseUser.uid);

      if (!user) {
        throw new AppError('User profile not found', 404);
      }

      // Update last login
      await this.userService.updateLastLogin(firebaseUser.uid);

      // Generate custom token for client authentication
      const customToken = await auth.createCustomToken(firebaseUser.uid, {
        role: user.role || 'user',
        admin: user.role === 'admin'
      });

      return {
        user,
        customToken,
        message: 'Login successful'
      };

    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        throw new AppError('Invalid email or password', 401);
      }

      if (error instanceof AppError) {
        throw error;
      }

      logger.error('Login error:', error);
      throw new AppError('Login failed', 500);
    }
  }

  async verifyIdToken(idToken) {
    try {
      return await auth.verifyIdToken(idToken);
    } catch (error) {
      logger.error('Token verification error:', error);

      if (error.code === 'auth/id-token-expired') {
        throw new AppError('Token expired', 401);
      }

      if (error.code === 'auth/invalid-id-token') {
        throw new AppError('Invalid token', 401);
      }

      throw new AppError('Token verification failed', 401);
    }
  }

  async getUserFromToken(idToken) {
    try {
      const decodedToken = await this.verifyIdToken(idToken);
      const user = await this.userService.getUserById(decodedToken.uid);

      if (!user) {
        throw new AppError('User not found', 404);
      }

      // Update last active timestamp
      await this.userService.updateLastLogin(decodedToken.uid);

      return user;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      logger.error('Get user from token error:', error);
      throw new AppError('Failed to get user', 500);
    }
  }

  async resetPassword(email) {
    try {
      // Generate password reset link
      const resetLink = await auth.generatePasswordResetLink(email);

      // In production, you would send this link via email
      logger.info(`Password reset link generated for ${email}: ${resetLink}`);

      return {
        message: 'Password reset email sent',
        // Don't return the actual link in production
        resetLink: process.env.NODE_ENV === 'development' ? resetLink : undefined
      };
    } catch (error) {
      logger.error('Password reset error:', error);

      if (error.code === 'auth/user-not-found') {
        throw new AppError('No user found with this email', 404);
      }

      throw new AppError('Failed to send password reset email', 500);
    }
  }

  async updateUserProfile(uid, updateData) {
    try {
      // Update Firebase user record if needed
      const firebaseUpdates = {};

      if (updateData.displayName) {
        firebaseUpdates.displayName = updateData.displayName;
      }

      if (updateData.email) {
        firebaseUpdates.email = updateData.email;
      }

      if (Object.keys(firebaseUpdates).length > 0) {
        await auth.updateUser(uid, firebaseUpdates);
      }

      // Update user profile in Firestore
      const updatedUser = await this.userService.updateUser(uid, updateData);

      return {
        user: updatedUser,
        message: 'Profile updated successfully'
      };
    } catch (error) {
      logger.error('Profile update error:', error);

      if (error.code === 'auth/email-already-exists') {
        throw new AppError('Email already in use', 409);
      }

      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError('Profile update failed', 500);
    }
  }

  async setAdminClaim(uid) {
    try {
      await auth.setCustomUserClaims(uid, {
        role: 'admin',
        admin: true
      });

      // Update user role in Firestore
      await this.userService.updateUser(uid, { role: 'admin' });

      return { message: 'Admin privileges granted' };
    } catch (error) {
      logger.error('Set admin claim error:', error);
      throw new AppError('Failed to set admin privileges', 500);
    }
  }

  async revokeAdminClaim(uid) {
    try {
      await auth.setCustomUserClaims(uid, {
        role: 'user',
        admin: false
      });

      // Update user role in Firestore
      await this.userService.updateUser(uid, { role: 'user' });

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

  async refreshCustomToken(uid) {
    try {
      const user = await this.userService.getUserById(uid);

      if (!user) {
        throw new AppError('User not found', 404);
      }

      const customToken = await auth.createCustomToken(uid, {
        role: user.role || 'user',
        admin: user.role === 'admin'
      });

      return { customToken };
    } catch (error) {
      logger.error('Refresh custom token error:', error);
      throw new AppError('Failed to refresh token', 500);
    }
  }
}

module.exports = AuthService;
