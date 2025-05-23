const UserRepository = require('../repositories/userRepository');
const { validateUser } = require('../models/User');
const { AppError } = require('../utils/errorHandler');
const logger = require('../utils/logger');

class UserService {
  constructor() {
    this.userRepository = new UserRepository();
  }

  async createUser(userData) {
    // Validate user data
    const { error, value } = validateUser(userData);
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
    const user = await this.userRepository.findById(uid);
    if (!user) {
      throw new AppError('User not found', 404);
    }
    return user;
  }

  async getUserByEmail(email) {
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

    // Update favorite relationship type only if there are games played
    const relationshipCounts = {};
    Object.keys(statistics.connectionLevelsReached).forEach(type => {
      relationshipCounts[type] = (relationshipCounts[type] || 0) + 1;
    });

    if (Object.keys(relationshipCounts).length > 0) {
      const favoriteType = Object.keys(relationshipCounts).reduce((a, b) =>
        relationshipCounts[a] > relationshipCounts[b] ? a : b
      );
      statistics.favoriteRelationshipType = favoriteType;
    } else {
      statistics.favoriteRelationshipType = null;
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