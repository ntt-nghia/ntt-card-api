const { db } = require('../config/firebase');
const { AppError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

class DeckRepository {
  constructor() {
    this.collection = db.collection('decks');
  }

  /**
   * Create a new deck
   * @param {Object} deckData - Deck data
   * @returns {Object} Created deck with ID
   */
  create = async deckData => {
    try {
      const docRef = await this.collection.add({
        ...deckData,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      return await this.findById(docRef.id);
    } catch (error) {
      logger.error('Error creating deck:', error);
      throw new AppError('Failed to create deck', 500);
    }
  };

  /**
   * Find deck by ID
   * @param {string} deckId - Deck ID
   * @returns {Object|null} Deck object or null
   */
  findById = async deckId => {
    try {
      const doc = await this.collection.doc(deckId)
        .get();

      if (!doc.exists) {
        return null;
      }

      return {
        id: doc.id,
        ...doc.data()
      };
    } catch (error) {
      logger.error('Error finding deck by ID:', error);
      throw new AppError('Failed to retrieve deck', 500);
    }
  };

  /**
   * Find all decks
   * @param {Object} filters - Query filters
   * @returns {Array} Array of decks
   */
  findAll = async (filters = {}) => {
    try {
      let query = this.collection;

      // Apply filters
      if (filters.relationshipType) {
        query = query.where('relationshipType', '==', filters.relationshipType);
      }

      if (filters.tier) {
        query = query.where('tier', '==', filters.tier);
      }

      if (filters.status) {
        query = query.where('status', '==', filters.status);
      }

      // Order by creation date by default
      query = query.orderBy('createdAt', 'desc');

      const snapshot = await query.get();

      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      logger.error('Error finding decks:', error);
      throw new AppError('Failed to retrieve decks', 500);
    }
  };

  /**
   * Find decks by relationship type
   * @param {string} relationshipType - Relationship type
   * @param {boolean} activeOnly - Only return active decks
   * @returns {Array} Array of decks
   */
  findByRelationshipType = async (relationshipType, activeOnly = true) => {
    try {
      let query = this.collection.where('relationshipType', '==', relationshipType);

      if (activeOnly) {
        query = query.where('status', '==', 'active');
      }

      const snapshot = await query.get();

      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      logger.error('Error finding decks by relationship type:', error);
      throw new AppError('Failed to retrieve decks', 500);
    }
  };

  /**
   * Find decks by IDs
   * @param {Array} deckIds - Array of deck IDs
   * @returns {Array} Array of decks
   */
  findByIds = async (deckIds) => {
    if (!deckIds || deckIds.length === 0) {
      return [];
    }

    try {
      const decks = await Promise.all(
        deckIds.map((id) => this.findById(id))
      );

      return decks.filter((deck) => deck !== null);
    } catch (error) {
      logger.error('Error finding decks by IDs:', error);
      throw new AppError('Failed to retrieve decks', 500);
    }
  };

  /**
   * Update deck
   * @param {string} deckId - Deck ID
   * @param {Object} updateData - Update data
   * @returns {Object} Updated deck
   */
  update = async (deckId, updateData) => {
    try {
      await this.collection.doc(deckId)
        .update({
          ...updateData,
          updatedAt: new Date()
        });

      return await this.findById(deckId);
    } catch (error) {
      logger.error('Error updating deck:', error);
      throw new AppError('Failed to update deck', 500);
    }
  };

  /**
   * Update deck statistics
   * @param {string} deckId - Deck ID
   * @param {Object} statistics - Statistics to update
   */
  updateStatistics = async (deckId, statistics) => {
    try {
      await this.collection.doc(deckId)
        .update({
          statistics,
          updatedAt: new Date()
        });
    } catch (error) {
      logger.error('Error updating deck statistics:', error);
      throw new AppError('Failed to update deck statistics', 500);
    }
  };

  /**
   * Update card count for a deck
   * @param {string} deckId - Deck ID
   * @param {Object} cardCount - Card count object
   */
  updateCardCount = async (deckId, cardCount) => {
    try {
      await this.collection.doc(deckId)
        .update({
          cardCount,
          updatedAt: new Date()
        });
    } catch (error) {
      logger.error('Error updating deck card count:', error);
      throw new AppError('Failed to update card count', 500);
    }
  };

  /**
   * Increment purchase count
   * @param {string} deckId - Deck ID
   */
  incrementPurchases = async deckId => {
    try {
      const deck = await this.findById(deckId);
      if (!deck) {
        throw new AppError('Deck not found', 404);
      }

      const statistics = deck.statistics || {};
      statistics.purchases = (statistics.purchases || 0) + 1;

      await this.updateStatistics(deckId, statistics);
    } catch (error) {
      logger.error('Error incrementing purchases:', error);
      throw new AppError('Failed to update purchase count', 500);
    }
  };

  /**
   * Delete deck
   * @param {string} deckId - Deck ID
   */
  delete = async deckId => {
    try {
      await this.collection.doc(deckId)
        .delete();
    } catch (error) {
      logger.error('Error deleting deck:', error);
      throw new AppError('Failed to delete deck', 500);
    }
  };
}

module.exports = DeckRepository;
