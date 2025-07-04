const { db } = require('../config/firebase');
const { AppError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

class UserRepository {
  constructor() {
    this.collection = db.collection('users');
  }

  create = async userData => {
    try {
      await this.collection.doc(userData.uid)
        .set({
          ...userData,
          createdAt: new Date(),
          updatedAt: new Date()
        });
      return await this.findById(userData.uid);
    } catch (error) {
      logger.error('Error creating user:', error);
      throw new AppError('Failed to create user', 500);
    }
  };

  findById = async uid => {
    try {
      const doc = await this.collection.doc(uid)
        .get();

      if (!doc.exists) {
        return null;
      }

      return {
        id: doc.id,
        ...doc.data()
      };
    } catch (error) {
      logger.error('Error finding user by ID:', error);
      throw new AppError('Failed to retrieve user', 500);
    }
  };

  findByEmail = async email => {
    try {
      const snapshot = await this.collection.where('email', '==', email)
        .get();

      if (snapshot.empty) {
        return null;
      }

      const doc = snapshot.docs[0];
      return {
        id: doc.id,
        ...doc.data()
      };
    } catch (error) {
      logger.error('Error finding user by email:', error);
      throw new AppError('Failed to retrieve user', 500);
    }
  };

  update = async (uid, updateData) => {
    try {
      await this.collection.doc(uid)
        .update({
          ...updateData,
          updatedAt: new Date()
        });

      return await this.findById(uid);
    } catch (error) {
      logger.error('Error updating user:', error);
      throw new AppError('Failed to update user', 500);
    }
  };

  updateLastLogin = async uid => {
    try {
      await this.collection.doc(uid)
        .update({
          lastLoginAt: new Date()
        });
    } catch (error) {
      logger.error('Error updating last login:', error);
      // Don't throw error for this non-critical update
    }
  };

  updateStatistics = async (uid, statistics) => {
    try {
      await this.collection.doc(uid)
        .update({
          statistics,
          updatedAt: new Date()
        });
    } catch (error) {
      logger.error('Error updating user statistics:', error);
      throw new AppError('Failed to update user statistics', 500);
    }
  };

  updateLanguage = async (uid, language) => {
    try {
      await this.collection.doc(uid)
        .update({
          language,
          updatedAt: new Date()
        });

      return await this.findById(uid);
    } catch (error) {
      logger.error('Error updating user language:', error);
      throw new AppError('Failed to update language preference', 500);
    }
  };

  addUnlockedDeck = async (uid, deckId) => {
    try {
      const user = await this.findById(uid);
      if (!user) {
        throw new AppError('User not found', 404);
      }

      const unlockedDecks = user.unlockedDecks || [];
      if (!unlockedDecks.includes(deckId)) {
        unlockedDecks.push(deckId);

        await this.collection.doc(uid)
          .update({
            unlockedDecks,
            updatedAt: new Date()
          });
      }

      return await this.findById(uid);
    } catch (error) {
      logger.error('Error adding unlocked deck:', error);
      throw new AppError('Failed to unlock deck', 500);
    }
  };

  addPurchaseHistory = async (uid, purchaseData) => {
    try {
      const user = await this.findById(uid);
      if (!user) {
        throw new AppError('User not found', 404);
      }

      const purchaseHistory = user.purchaseHistory || [];
      purchaseHistory.push({
        ...purchaseData,
        purchaseDate: new Date()
      });

      await this.collection.doc(uid)
        .update({
          purchaseHistory,
          updatedAt: new Date()
        });

      return await this.findById(uid);
    } catch (error) {
      logger.error('Error adding purchase history:', error);
      throw new AppError('Failed to record purchase', 500);
    }
  };

  findByUnlockedDeck = async deckId => {
    try {
      const snapshot = await this.collection
        .where('unlockedDecks', 'array-contains', deckId)
        .get();

      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      logger.error('Error finding users by deck:', error);
      throw new AppError('Failed to retrieve users', 500);
    }
  };

  delete = async uid => {
    try {
      await this.collection.doc(uid)
        .delete();
    } catch (error) {
      logger.error('Error deleting user:', error);
      throw new AppError('Failed to delete user', 500);
    }
  };
}

module.exports = UserRepository;
