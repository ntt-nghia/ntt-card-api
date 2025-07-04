const { db } = require('../config/firebase');
const { AppError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');
const { Timestamp } = require('@google-cloud/firestore/build/src');

class CardRepository {
  constructor() {
    this.collection = db.collection('cards');
  }

  /**
   * Create a new card
   * @param {Object} cardData - Card data
   * @returns {Object} Created card with ID
   */
  create = async cardData => {
    try {
      const docRef = await this.collection.add({
        ...cardData,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      return await this.findById(docRef.id);
    }
    catch (error) {
      logger.error('Error creating card:', error);
      throw new AppError('Failed to create card', 500);
    }
  };

  /**
   * Find card by ID
   * @param {string} cardId - Card ID
   * @returns {Object|null} Card object or null
   */
  findById = async cardId => {
    try {
      const doc = await this.collection.doc(cardId).get();

      if (!doc.exists) {
        return null;
      }

      return {
        id: doc.id,
        ...doc.data()
      };
    }
    catch (error) {
      logger.error('Error finding card by ID:', error);
      throw new AppError('Failed to retrieve card', 500);
    }
  };

  /**
   * Find cards by deck ID
   * @param {string} deckId - Deck ID
   * @param {Object} filters - Additional filters
   * @returns {Array} Array of cards
   */
  findByDeckId = async (deckId, filters = {}) => {
    try {
      let query = this.collection.where('deckIds', 'array-contains', deckId);

      // Apply additional filters
      if (filters.connectionLevel) {
        query = query.where('connectionLevel', '==', filters.connectionLevel);
      }

      if (filters.type) {
        query = query.where('type', '==', filters.type);
      }

      if (filters.status) {
        query = query.where('status', '==', filters.status);
      }

      const snapshot = await query.get();

      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      }));
    }
    catch (error) {
      logger.error('Error finding cards by deck ID:', error);
      throw new AppError('Failed to retrieve cards', 500);
    }
  };

  /**
   * Find cards by multiple deck IDs
   * @param {Array} deckIds - Array of deck IDs
   * @param {Object} filters - Additional filters
   * @returns {Array} Array of cards
   */
  findByDeckIds = async (deckIds, filters = {}) => {
    if (!deckIds || deckIds.length === 0) {
      return [];
    }

    try {
      // Firestore doesn't support array-contains-any with multiple values
      // So we need to fetch cards for each deck and merge
      const cardPromises = deckIds.map((deckId) => this.findByDeckId(deckId, filters));

      const cardArrays = await Promise.all(cardPromises);

      // Flatten and remove duplicates
      const cardMap = new Map();
      cardArrays.flat().forEach((card) => {
        cardMap.set(card.id, card);
      });

      return Array.from(cardMap.values());
    }
    catch (error) {
      logger.error('Error finding cards by deck IDs:', error);
      throw new AppError('Failed to retrieve cards', 500);
    }
  };

  /**
   * Find cards by filters
   * @param {Object} filters - Query filters
   * @returns {Array} Array of cards
   */
  findByFilters = async (filters = {}) => {
    try {
      let query = this.collection;

      if (filters.relationshipType) {
        query = query.where('relationshipTypes', 'array-contains', filters.relationshipType);
      }

      if (filters.connectionLevel) {
        query = query.where('connectionLevel', '==', filters.connectionLevel);
      }

      if (filters.type) {
        query = query.where('type', '==', filters.type);
      }

      if (filters.status) {
        query = query.where('status', '==', filters.status);
      }

      if (filters.theta) {
        query = query.where('theta', '>=', filters.theta.min)
          .where('theta', '<=', filters.theta.max);
      }

      const snapshot = await query.get();

      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      }));
    }
    catch (error) {
      logger.error('Error finding cards by filters:', error);
      throw new AppError('Failed to retrieve cards', 500);
    }
  };

  /**
   * Find unassigned cards (not in any deck)
   * @param {Object} filters - Query filters
   * @returns {Array} Array of cards
   */
  findUnassignedCards = async (filters = {}) => {
    try {
      let query = this.collection.where('deckIds', '==', []);

      if (filters.relationshipType) {
        query = query.where('relationshipTypes', 'array-contains', filters.relationshipType);
      }

      const snapshot = await query.get();

      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      }));
    }
    catch (error) {
      logger.error('Error finding unassigned cards:', error);
      throw new AppError('Failed to retrieve unassigned cards', 500);
    }
  };

  /**
   * Update card
   * @param {string} cardId - Card ID
   * @param {Object} updateData - Update data
   * @returns {Object} Updated card
   */
  update = async (cardId, updateData) => {
    try {
      await this.collection.doc(cardId).update({
        ...updateData,
        updatedAt: Timestamp.now()
      });

      return await this.findById(cardId);
    }
    catch (error) {
      logger.error('Error updating card:', error);
      throw new AppError('Failed to update card', 500);
    }
  };

  /**
   * Add card to deck
   * @param {string} cardId - Card ID
   * @param {string} deckId - Deck ID
   */
  addToDeck = async (cardId, deckId) => {
    try {
      const card = await this.findById(cardId);
      if (!card) {
        throw new AppError('Card not found', 404);
      }

      const deckIds = card.deckIds || [];
      if (!deckIds.includes(deckId)) {
        deckIds.push(deckId);
        await this.update(cardId, { deckIds });
      }
    }
    catch (error) {
      logger.error('Error adding card to deck:', error);
      throw new AppError('Failed to add card to deck', 500);
    }
  };

  /**
   * Remove card from deck
   * @param {string} cardId - Card ID
   * @param {string} deckId - Deck ID
   */
  removeFromDeck = async (cardId, deckId) => {
    try {
      const card = await this.findById(cardId);
      if (!card) {
        throw new AppError('Card not found', 404);
      }

      const deckIds = card.deckIds || [];
      const index = deckIds.indexOf(deckId);
      if (index > -1) {
        deckIds.splice(index, 1);
        await this.update(cardId, { deckIds });
      }
    }
    catch (error) {
      logger.error('Error removing card from deck:', error);
      throw new AppError('Failed to remove card from deck', 500);
    }
  };

  /**
   * Update card statistics
   * @param {string} cardId - Card ID
   * @param {Object} statistics - Statistics to update
   */
  updateStatistics = async (cardId, statistics) => {
    try {
      await this.collection.doc(cardId).update({
        statistics,
        updatedAt: new Date()
      });
    }
    catch (error) {
      logger.error('Error updating card statistics:', error);
      throw new AppError('Failed to update card statistics', 500);
    }
  };

  /**
   * Increment language usage
   * @param {string} cardId - Card ID
   * @param {string} language - Language code
   */
  incrementLanguageUsage = async (cardId, language) => {
    try {
      const card = await this.findById(cardId);
      if (!card) {
        throw new AppError('Card not found', 404);
      }

      const statistics = card.statistics || {};
      const languageUsage = statistics.languageUsage || {};
      languageUsage[language] = (languageUsage[language] || 0) + 1;

      statistics.languageUsage = languageUsage;
      statistics.timesDrawn = (statistics.timesDrawn || 0) + 1;

      await this.updateStatistics(cardId, statistics);
    }
    catch (error) {
      logger.error('Error incrementing language usage:', error);
      throw new AppError('Failed to update language usage', 500);
    }
  };

  /**
   * Bulk create cards
   * @param {Array} cardsData - Array of card data
   * @returns {Array} Created cards
   */
  bulkCreate = async cardsData => {
    try {
      const batch = db.batch();
      const cardRefs = [];

      cardsData.forEach((cardData) => {
        const docRef = this.collection.doc();
        batch.set(docRef, {
          ...cardData,
          createdAt: new Date(),
          updatedAt: new Date()
        });
        cardRefs.push(docRef);
      });

      await batch.commit();

      // Fetch created cards
      return await Promise.all(
        cardRefs.map(async (ref) => {
          const doc = await ref.get();
          return {
            id: doc.id,
            ...doc.data()
          };
        })
      );
    }
    catch (error) {
      logger.error('Error bulk creating cards:', error);
      throw new AppError('Failed to create cards', 500);
    }
  };

  /**
   * Delete card
   * @param {string} cardId - Card ID
   */
  delete = async cardId => {
    try {
      await this.collection.doc(cardId).delete();
    }
    catch (error) {
      logger.error('Error deleting card:', error);
      throw new AppError('Failed to delete card', 500);
    }
  };
}

module.exports = CardRepository;
