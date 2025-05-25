const UserService = require('../services/userService');
const { AppError } = require('../middleware/errorHandler');

class UserController {
  constructor() {
    this.userService = new UserService();
  }

  getProfile = async (req, res) => {
    const user = await this.userService.getUserById(req.user.uid);

    res.status(200).json({
      status: 'success',
      data: { user }
    });
  };

  updateProfile = async (req, res) => {
    const updatedUser = await this.userService.updateUser(req.user.uid, req.body);

    res.status(200).json({
      status: 'success',
      data: {
        user: updatedUser,
        message: 'Profile updated successfully'
      }
    });
  };

  updatePreferences = async (req, res) => {
    const { preferences } = req.body;

    if (!preferences) {
      throw new AppError('Preferences data is required', 400);
    }

    const updatedUser = await this.userService.updateUserPreferences(req.user.uid, preferences);

    res.status(200).json({
      status: 'success',
      data: {
        user: updatedUser,
        message: 'Preferences updated successfully'
      }
    });
  };

  getStatistics = async (req, res) => {
    const user = await this.userService.getUserById(req.user.uid);

    res.status(200).json({
      status: 'success',
      data: {
        statistics: user.statistics,
        gamesPlayed: user.statistics.gamesPlayed || 0,
        connectionLevelsReached: user.statistics.connectionLevelsReached || {},
        favoriteRelationshipType: user.statistics.favoriteRelationshipType
      }
    });
  };

  recordGameCompletion = async (req, res) => {
    const { relationshipType, connectionLevel, sessionDuration } = req.body;

    if (!relationshipType || !connectionLevel) {
      throw new AppError('Game data is required', 400);
    }

    const statistics = await this.userService.recordGamePlayed(req.user.uid, {
      relationshipType,
      connectionLevel,
      sessionDuration
    });

    res.status(200).json({
      status: 'success',
      data: {
        statistics,
        message: 'Game completion recorded'
      }
    });
  };

  deleteAccount = async (req, res) => {
    await this.userService.deleteUser(req.user.uid);

    res.status(200).json({
      status: 'success',
      message: 'Account deleted successfully'
    });
  };

  // Admin-only endpoints
  getAllUsers = async (req, res) => {
    // This would need pagination in a real application
    const { page = 1, limit = 20 } = req.query;

    // Implement pagination logic here
    res.status(200).json({
      status: 'success',
      message: 'Get all users - implement pagination'
    });
  };

  getUserById = async (req, res) => {
    const { uid } = req.params;
    const user = await this.userService.getUserById(uid);

    res.status(200).json({
      status: 'success',
      data: { user }
    });
  };
}

module.exports = new UserController();
