const UserRepository = require('../repositories/userRepository');
const { validateUser } = require('../models/User');
const { AppError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

class UserService {
  constructor() {
    this.userRepository = new UserRepository();
  }

  async createUser(userData) {
    const {
      error,
      value
    } = validateUser(userData);
    if (error) {
      logger.error('User validation error:', error.details);
      throw new AppError(`Validation error: ${error.details[0].message}`, 400);
    }

    const existingUser = await this.userRepository.findById(value.uid);
    if (existingUser) {
      throw new AppError('User already exists', 409);
    }

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

  async updateLanguagePreference(uid, language) {
    if (!['en', 'vn'].includes(language)) {
      throw new AppError('Invalid language. Supported languages: en, vn', 400);
    }

    return await this.userRepository.updateLanguage(uid, language);
  }

  async getUserUnlockedDecks(uid) {
    const user = await this.getUserById(uid);
    return user.unlockedDecks || [];
  }

  async unlockDeckForUser(uid, deckId, purchaseData = {}) {
    const user = await this.getUserById(uid);

    if (user.unlockedDecks?.includes(deckId)) {
      throw new AppError('Deck already unlocked', 400);
    }

    await this.userRepository.addUnlockedDeck(uid, deckId);

    if (purchaseData.amount !== undefined) {
      await this.userRepository.addPurchaseHistory(uid, {
        deckId,
        ...purchaseData
      });
    }

    return await this.getUserById(uid);
  }

  async recordSession(uid, sessionData) {
    const user = await this.getUserById(uid);
    const currentStats = user.statistics || {};

    const totalSessions = (currentStats.totalSessions || 0) + 1;

    const relationshipUsage = currentStats.relationshipTypeUsage || {};
    relationshipUsage[sessionData.relationshipType] =
      (relationshipUsage[sessionData.relationshipType] || 0) + 1;

    const currentAvg = currentStats.averageSessionDuration || 0;
    const newAvg = ((currentAvg * (totalSessions - 1)) + sessionData.duration) / totalSessions;

    // Calculate favorite relationship type
    let favoriteType = sessionData.relationshipType;
    let maxUsage = 1;

    Object.entries(relationshipUsage).forEach(([type, usage]) => {
      if (usage > maxUsage) {
        favoriteType = type;
        maxUsage = usage;
      }
    });

    const statistics = {
      ...currentStats,
      totalSessions,
      relationshipTypeUsage: relationshipUsage,
      averageSessionDuration: Math.round(newAvg),
      favoriteRelationshipType: this.calculateFavoriteType(currentStats)
    };

    await this.userRepository.updateStatistics(uid, statistics);
    return statistics;
  }

  calculateFavoriteType(currentStats, sessionData) {
    if (!currentStats.favoriteRelationshipType) {
      return sessionData.relationshipType;
    }
    else {
      return currentStats.favoriteRelationshipType;
    }
  }

  async recordGamePlayed(uid, gameData) {
    const user = await this.getUserById(uid);

    const currentStats = user.statistics || {};
    const connectionLevels = currentStats.connectionLevelsReached || {};

    const statistics = {
      ...currentStats,
      gamesPlayed: (currentStats.gamesPlayed || 0) + 1,
      connectionLevelsReached: {
        ...connectionLevels,
        [gameData.relationshipType]: Math.max(
          connectionLevels[gameData.relationshipType] || 0,
          gameData.connectionLevel
        )
      }
    };

    const relationshipUsage = currentStats.relationshipTypeUsage || {};
    let favoriteType = gameData.relationshipType;
    let maxUsage = relationshipUsage[gameData.relationshipType] || 0;

    Object.entries(relationshipUsage).forEach(([type, usage]) => {
      if (usage > maxUsage) {
        favoriteType = type;
        maxUsage = usage;
      }
    });

    statistics.favoriteRelationshipType = favoriteType;

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
