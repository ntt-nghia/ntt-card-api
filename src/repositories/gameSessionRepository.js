const { db } = require('../config/firebase');
const { AppError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

class GameSessionRepository {
  constructor() {
    this.collection = db.collection('sessions');
  }

  /**
   * Create a new session
   * @param {Object} sessionData - Session data
   * @returns {Object} Created session with ID
   */
  async create(sessionData) {
    try {
      const docRef = await this.collection.add({
        ...sessionData,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      return await this.findById(docRef.id);
    } catch (error) {
      logger.error('Error creating session:', error);
      throw new AppError('Failed to create session', 500);
    }
  }

  /**
   * Find session by ID
   * @param {string} sessionId - Session ID
   * @returns {Object|null} Session object or null
   */
  async findById(sessionId) {
    try {
      const doc = await this.collection.doc(sessionId).get();

      if (!doc.exists) {
        return null;
      }

      return {
        id: doc.id,
        ...doc.data()
      };
    } catch (error) {
      logger.error('Error finding session by ID:', error);
      throw new AppError('Failed to retrieve session', 500);
    }
  }

  /**
   * Find sessions by host ID
   * @param {string} hostId - Host user ID
   * @param {Object} filters - Additional filters
   * @returns {Array} Array of sessions
   */
  async findByHostId(hostId, filters = {}) {
    try {
      let query = this.collection.where('hostId', '==', hostId);

      if (filters.status) {
        query = query.where('status', '==', filters.status);
      }

      if (filters.relationshipType) {
        query = query.where('relationshipType', '==', filters.relationshipType);
      }

      query = query.orderBy('createdAt', 'desc');

      const snapshot = await query.get();

      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      logger.error('Error finding sessions by host ID:', error);
      throw new AppError('Failed to retrieve sessions', 500);
    }
  }

  /**
   * Update session
   * @param {string} sessionId - Session ID
   * @param {Object} updateData - Update data
   * @returns {Object} Updated session
   */
  async update(sessionId, updateData) {
    try {
      await this.collection.doc(sessionId).update({
        ...updateData,
        updatedAt: new Date()
      });

      return await this.findById(sessionId);
    } catch (error) {
      logger.error('Error updating session:', error);
      throw new AppError('Failed to update session', 500);
    }
  }

  /**
   * Add drawn card to session
   * @param {string} sessionId - Session ID
   * @param {string} cardId - Card ID
   */
  async addDrawnCard(sessionId, cardId) {
    try {
      const session = await this.findById(sessionId);
      if (!session) {
        throw new AppError('Session not found', 404);
      }

      const drawnCards = session.drawnCards || [];
      if (!drawnCards.includes(cardId)) {
        drawnCards.push(cardId);
        await this.update(sessionId, { drawnCards });
      }
    } catch (error) {
      logger.error('Error adding drawn card:', error);
      throw new AppError('Failed to add drawn card', 500);
    }
  }

  /**
   * Add completed card to session
   * @param {string} sessionId - Session ID
   * @param {string} cardId - Card ID
   */
  async addCompletedCard(sessionId, cardId) {
    try {
      const session = await this.findById(sessionId);
      if (!session) {
        throw new AppError('Session not found', 404);
      }

      const completedCards = session.completedCards || [];
      if (!completedCards.includes(cardId)) {
        completedCards.push(cardId);
        await this.update(sessionId, { completedCards });
      }
    } catch (error) {
      logger.error('Error adding completed card:', error);
      throw new AppError('Failed to add completed card', 500);
    }
  }

  /**
   * Add skipped card to session
   * @param {string} sessionId - Session ID
   * @param {string} cardId - Card ID
   */
  async addSkippedCard(sessionId, cardId) {
    try {
      const session = await this.findById(sessionId);
      if (!session) {
        throw new AppError('Session not found', 404);
      }

      const skippedCards = session.skippedCards || [];
      if (!skippedCards.includes(cardId)) {
        skippedCards.push(cardId);
        await this.update(sessionId, { skippedCards });
      }
    } catch (error) {
      logger.error('Error adding skipped card:', error);
      throw new AppError('Failed to add skipped card', 500);
    }
  }

  /**
   * Delete old sessions (cleanup)
   * @param {number} daysOld - Delete sessions older than this many days
   * @returns {number} Number of deleted sessions
   */
  async deleteOldSessions(daysOld = 7) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      const snapshot = await this.collection
        .where('createdAt', '<', cutoffDate)
        .get();

      const batch = db.batch();
      let count = 0;

      snapshot.forEach(doc => {
        batch.delete(doc.ref);
        count++;
      });

      await batch.commit();

      logger.info(`Deleted ${count} old sessions`);
      return count;
    } catch (error) {
      logger.error('Error deleting old sessions:', error);
      throw new AppError('Failed to delete old sessions', 500);
    }
  }

  /**
   * Get session analytics
   * @param {Object} filters - Query filters
   * @returns {Object} Analytics data
   */
  async getAnalytics(filters = {}) {
    try {
      let query = this.collection;

      if (filters.startDate) {
        query = query.where('createdAt', '>=', filters.startDate);
      }

      if (filters.endDate) {
        query = query.where('createdAt', '<=', filters.endDate);
      }

      if (filters.relationshipType) {
        query = query.where('relationshipType', '==', filters.relationshipType);
      }

      const snapshot = await query.get();

      const sessions = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Calculate analytics
      const analytics = {
        totalSessions: sessions.length,
        completedSessions: sessions.filter(s => s.status === 'completed').length,
        averageDuration: 0,
        averageCardsDrawn: 0,
        averageCompletionRate: 0,
        relationshipTypeBreakdown: {},
        languageBreakdown: {}
      };

      if (sessions.length > 0) {
        const durations = sessions
          .filter(s => s.analytics?.totalDuration)
          .map(s => s.analytics.totalDuration);

        analytics.averageDuration = durations.length > 0
          ? durations.reduce((a, b) => a + b, 0) / durations.length
          : 0;

        analytics.averageCardsDrawn = sessions
          .map(s => s.drawnCards?.length || 0)
          .reduce((a, b) => a + b, 0) / sessions.length;

        analytics.averageCompletionRate = sessions
          .map(s => {
            const drawn = s.drawnCards?.length || 0;
            const completed = s.completedCards?.length || 0;
            return drawn > 0 ? completed / drawn : 0;
          })
          .reduce((a, b) => a + b, 0) / sessions.length;

        // Breakdown by relationship type
        sessions.forEach(session => {
          const type = session.relationshipType;
          analytics.relationshipTypeBreakdown[type] =
            (analytics.relationshipTypeBreakdown[type] || 0) + 1;

          const lang = session.language || 'en';
          analytics.languageBreakdown[lang] =
            (analytics.languageBreakdown[lang] || 0) + 1;
        });
      }

      return analytics;
    } catch (error) {
      logger.error('Error getting session analytics:', error);
      throw new AppError('Failed to get analytics', 500);
    }
  }
}

module.exports = GameSessionRepository;
