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
    const result = await this.authService.registerUser(req.body);

    res.status(201)
      .json({
        status: 'success',
        data: result
      });
  };

  login = async (req, res) => {
    const { idToken } = req.body;

    if (!idToken) {
      throw new AppError('ID token is required', 400);
    }

    const user = await this.authService.getUserFromToken(idToken);

    res.status(200)
      .json({
        status: 'success',
        data: {
          user,
          message: 'Login successful'
        }
      });
  };

  logout = async (req, res) => {
    // Firebase logout is handled on client side
    // This endpoint can be used for logging purposes
    logger.info(`User ${req.user.uid} logged out`);

    res.status(200)
      .json({
        status: 'success',
        message: 'Logout successful'
      });
  };

  updateProfile = async (req, res) => {
    const updatedUser = await this.userService.updateUser(req.user.uid, req.body);

    res.status(200)
      .json({
        status: 'success',
        data: {
          user: updatedUser,
          message: 'Profile updated successfully'
        }
      });
  };

  forgotPassword = async (req, res) => {
    const { email } = req.body;

    if (!email) {
      throw new AppError('Email is required', 400);
    }

    const result = await this.authService.resetPassword(email);

    res.status(200)
      .json({
        status: 'success',
        data: result
      });
  };

  // Admin-only endpoints
  setAdminRole = async (req, res) => {
    const { uid } = req.params;

    const result = await this.authService.setAdminClaim(uid);

    res.status(200)
      .json({
        status: 'success',
        data: result
      });
  };

  revokeAdminRole = async (req, res) => {
    const { uid } = req.params;

    const result = await this.authService.revokeAdminClaim(uid);

    res.status(200)
      .json({
        status: 'success',
        data: result
      });
  };
}

module.exports = new AuthController();
