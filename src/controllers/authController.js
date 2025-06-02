const AuthService = require('../services/authService');
const UserService = require('../services/userService');
const { AppError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

class AuthController {
  constructor() {
    this.authService = new AuthService();
    this.userService = new UserService();
  }

  register = async (req, res) => {
    try {
      const result = await this.authService.registerUser(req.body);

      res.status(201).json({
        status: 'success',
        data: result
      });
    } catch (error) {
      logger.error('Registration controller error:', error);
      throw error;
    }
  };

  login = async (req, res) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        throw new AppError('Email and password are required', 400);
      }

      const result = await this.authService.loginUser({ email, password });

      res.status(200).json({
        status: 'success',
        data: result
      });
    } catch (error) {
      logger.error('Login controller error:', error);
      throw error;
    }
  };

  logout = async (req, res) => {
    try {
      // Firebase logout is handled on client side
      // This endpoint is mainly for logging purposes
      const userId = req.user?.uid;

      if (userId) {
        logger.info(`User ${userId} logged out`);
      }

      res.status(200).json({
        status: 'success',
        message: 'Logout successful'
      });
    } catch (error) {
      logger.error('Logout controller error:', error);
      // Don't throw error for logout - always succeed
      res.status(200).json({
        status: 'success',
        message: 'Logout completed'
      });
    }
  };

  forgotPassword = async (req, res) => {
    try {
      const { email } = req.body;

      if (!email) {
        throw new AppError('Email is required', 400);
      }

      const result = await this.authService.resetPassword(email);

      res.status(200).json({
        status: 'success',
        data: result
      });
    } catch (error) {
      logger.error('Forgot password controller error:', error);
      throw error;
    }
  };

  updateProfile = async (req, res) => {
    try {
      const userId = req.user?.uid;

      if (!userId) {
        throw new AppError('User not authenticated', 401);
      }

      const result = await this.authService.updateUserProfile(userId, req.body);

      res.status(200).json({
        status: 'success',
        data: result
      });
    } catch (error) {
      logger.error('Update profile controller error:', error);
      throw error;
    }
  };

  // New endpoint for token refresh
  refreshToken = async (req, res) => {
    try {
      const userId = req.user?.uid;

      if (!userId) {
        throw new AppError('User not authenticated', 401);
      }

      const result = await this.authService.refreshCustomToken(userId);

      res.status(200).json({
        status: 'success',
        data: result
      });
    } catch (error) {
      logger.error('Refresh token controller error:', error);
      throw error;
    }
  };

  // Get current user profile (used by frontend to verify token)
  getProfile = async (req, res) => {
    try {
      const userId = req.user?.uid;

      if (!userId) {
        throw new AppError('User not authenticated', 401);
      }

      const user = await this.userService.getUserById(userId);

      res.status(200).json({
        status: 'success',
        data: { user }
      });
    } catch (error) {
      logger.error('Get profile controller error:', error);
      throw error;
    }
  };

  // Admin-only endpoints
  setAdminRole = async (req, res) => {
    try {
      const { uid } = req.params;

      if (!uid) {
        throw new AppError('User ID is required', 400);
      }

      const result = await this.authService.setAdminClaim(uid);

      res.status(200).json({
        status: 'success',
        data: result
      });
    } catch (error) {
      logger.error('Set admin role controller error:', error);
      throw error;
    }
  };

  revokeAdminRole = async (req, res) => {
    try {
      const { uid } = req.params;

      if (!uid) {
        throw new AppError('User ID is required', 400);
      }

      const result = await this.authService.revokeAdminClaim(uid);

      res.status(200).json({
        status: 'success',
        data: result
      });
    } catch (error) {
      logger.error('Revoke admin role controller error:', error);
      throw error;
    }
  };

  deleteUser = async (req, res) => {
    try {
      const { uid } = req.params;

      if (!uid) {
        throw new AppError('User ID is required', 400);
      }

      const result = await this.authService.deleteUser(uid);

      res.status(200).json({
        status: 'success',
        data: result
      });
    } catch (error) {
      logger.error('Delete user controller error:', error);
      throw error;
    }
  };

  // Health check endpoint for authentication service
  healthCheck = async (req, res) => {
    try {
      res.status(200).json({
        status: 'success',
        service: 'auth',
        timestamp: new Date().toISOString(),
        authenticated: !!req.user
      });
    } catch (error) {
      logger.error('Auth health check error:', error);
      res.status(500).json({
        status: 'error',
        message: 'Authentication service unavailable'
      });
    }
  };
}

module.exports = new AuthController();
