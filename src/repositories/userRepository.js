const { db } = require('../config/firebase');
const { AppError } = require('../utils/errorHandler');
const logger = require('../utils/logger');

class UserRepository {
  constructor() {
    this.collection = db.collection('users');
  }

  async create(userData) {
    try {
      const docRef = await this.collection.doc(userData.uid).set({
        ...userData,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      return await this.findById(userData.uid);
    } catch (error) {
      logger.error('Error creating user:', error);
      throw new AppError('Failed to create user', 500);
    }
  }

  async findById(uid) {
    try {
      const doc = await this.collection.doc(uid).get();

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
  }

  async findByEmail(email) {
    try {
      const snapshot = await this.collection.where('email', '==', email).get();

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
  }

  async update(uid, updateData) {
    try {
      await this.collection.doc(uid).update({
        ...updateData,
        updatedAt: new Date()
      });

      return await this.findById(uid);
    } catch (error) {
      logger.error('Error updating user:', error);
      throw new AppError('Failed to update user', 500);
    }
  }

  async updateLastLogin(uid) {
    try {
      await this.collection.doc(uid).update({
        lastLoginAt: new Date()
      });
    } catch (error) {
      logger.error('Error updating last login:', error);
      // Don't throw error for this non-critical update
    }
  }

  async updateStatistics(uid, statistics) {
    try {
      await this.collection.doc(uid).update({
        'statistics': statistics,
        updatedAt: new Date()
      });
    } catch (error) {
      logger.error('Error updating user statistics:', error);
      throw new AppError('Failed to update user statistics', 500);
    }
  }

  async delete(uid) {
    try {
      await this.collection.doc(uid).delete();
    } catch (error) {
      logger.error('Error deleting user:', error);
      throw new AppError('Failed to delete user', 500);
    }
  }
}

module.exports = UserRepository;