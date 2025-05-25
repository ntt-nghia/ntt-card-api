const UserRepository = require('../repositories/userRepository');
const { validateUser } = require('../models/User');
const { AppError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

class UserService {
  constructor() {
    this.userRepository = new UserRepository();
  }

  async createUser(userData) {
    // Validate user data
    const {
      error,
      value
    } = validateUser(userData);
    if (error) {
      logger.error('User validation error:', error.details);
      throw new AppError(`Validation error: ${error.details[0].message}`, 400);
    }

    // Check if user already exists by uid (not email, since Firebase handles email uniqueness)
    const existingUser = await this.userRepository.findById(value.uid);
    if (existingUser) {
      throw new AppError('User already exists', 409);
    }

    // Create user
    return await this.userRepository.create(value);
  }

  async getUserById(uid) {
    if (!uid) {
      throw new AppError('Id is invalid', 400);
    }
    const user = await this.userRepository.findById(uid);
    if (!user) {
      throw new AppError('User not found', 404);
    }
    return user;
  }

  async getUserByEmail(email) {
    if (!email) {
      throw new AppError('Email is invalid', 400);
    }
    return await this.userRepository.findByEmail(email);
  }

  async updateUser(uid, updateData) {
    // Validate update data if it contains email
    if (updateData.email) {
      const existingUser = await this.userRepository.findByEmail(updateData.email);
      if (existingUser && existingUser.uid !== uid) {
        throw new AppError('Email already in use by another user', 409);
      }
    }

    return await this.userRepository.update(uid, updateData);
  }

  async updateUserPreferences(uid, preferences) {
    const user = await this.getUserById(uid);

    const updatedPreferences = {
      ...user.preferences,
      ...preferences
    };

    return await this.userRepository.update(uid, { preferences: updatedPreferences });
  }

  async recordSession(uid, sessionData) {
    const user = await this.getUserById(uid);
    const currentStats = user.statistics || {};

    // Update session count
    const totalSessions = (currentStats.totalSessions || 0) + 1;

    // Update relationship type usage
    const relationshipUsage = currentStats.relationshipTypeUsage || {};
    relationshipUsage[sessionData.relationshipType] =
      (relationshipUsage[sessionData.relationshipType] || 0) + 1;

    // Update average session duration
    const currentAvg = currentStats.averageSessionDuration || 0;
    const newAvg = ((currentAvg * (totalSessions - 1)) + sessionData.duration) / totalSessions;

    const statistics = {
      totalSessions,
      relationshipTypeUsage,
      averageSessionDuration: Math.round(newAvg),
      favoriteRelationshipType: this.calculateFavoriteType(relationshipUsage)
    };

    await this.userRepository.updateStatistics(uid, statistics);
    return statistics;
  }

  async recordGamePlayed(uid, gameData) {
    const user = await this.getUserById(uid);

    const currentStats = user.statistics || {};
    const connectionLevels = currentStats.connectionLevelsReached || {};

    const statistics = {
      gamesPlayed: (currentStats.gamesPlayed || 0) + 1,
      connectionLevelsReached: {
        ...connectionLevels,
        [gameData.relationshipType]: Math.max(
          connectionLevels[gameData.relationshipType] || 0,
          gameData.connectionLevel
        )
      }
    };

    // Fix: Remove the broken favorite calculation entirely
    // Keep the existing favorite unless it's the first game
    if (!currentStats.favoriteRelationshipType) {
      // First game ever - set this relationship type as favorite
      statistics.favoriteRelationshipType = gameData.relationshipType;
    }
    else {
      // Keep the existing favorite - don't change it based on single games
      // This prevents the erratic behavior of the original code
      statistics.favoriteRelationshipType = currentStats.favoriteRelationshipType;
    }

    await this.userRepository.updateStatistics(uid, statistics);
    return statistics;
  }

  async updateLastLogin(uid) {
    await this.userRepository.updateLastLogin(uid);
  }

  async deleteUser(uid) {
    await this.userRepository.delete(uid);
  }
}

module.exports = UserService;
