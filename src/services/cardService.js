const CardRepository = require('../repositories/cardRepository');
const DeckRepository = require('../repositories/deckRepository');
const {
  validateCard,
  getCardContent
} = require('../models/Card');
const { AppError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

class CardService {
  constructor() {
    this.cardRepository = new CardRepository();
    this.deckRepository = new DeckRepository();
  }

  /**
   * Get cards with pagination and filtering for admin
   * @param {Object} filters - Filter criteria
   * @param {Object} options - Pagination and sorting options
   * @returns {Object} Cards with pagination info
   */
  getCardsWithPagination = async (filters = {}, options = {}) => {
    const {
      limit = 20,
      offset = 0,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      language = 'en'
    } = options;

    try {
      // Use your existing repository method or create a new one
      const allCards = await this.cardRepository.findByFilters(filters);

      // Apply search if provided
      let filteredCards = allCards;
      if (filters.search) {
        const searchTerm = filters.search.toLowerCase();
        filteredCards = allCards.filter(card => {
          const content = getCardContent(card, language)
            .toLowerCase();
          return content.includes(searchTerm) ||
            (card.type && card.type.toLowerCase()
              .includes(searchTerm)) ||
            (card.status && card.status.toLowerCase()
              .includes(searchTerm));
        });
      }

      // Sort cards
      const sortedCards = filteredCards.sort((a, b) => {
        let aVal = a[sortBy];
        let bVal = b[sortBy];

        // Handle date sorting
        if (sortBy === 'createdAt' || sortBy === 'updatedAt') {
          aVal = new Date(aVal);
          bVal = new Date(bVal);
        }

        if (sortOrder === 'desc') {
          return bVal > aVal ? 1 : -1;
        }
        return aVal > bVal ? 1 : -1;
      });

      // Apply pagination
      const paginatedCards = sortedCards.slice(offset, offset + limit);

      // Format cards for response
      const formattedCards = paginatedCards.map(card =>
        this.formatCardForAdmin(card, language)
      );

      return {
        cards: formattedCards,
        total: filteredCards.length,
        hasMore: offset + limit < filteredCards.length
      };

    } catch (error) {
      logger.error('Error getting cards with pagination:', error);
      throw new AppError('Failed to retrieve cards', 500);
    }
  };

  /**
   * Format card for admin response
   * @param {Object} card - Card object
   * @param {string} language - Language code
   * @returns {Object} Formatted card
   */
  formatCardForAdmin(card, language = 'en') {
    return {
      id: card.id,
      content: getCardContent(card, language),
      type: card.type,
      connectionLevel: card.connectionLevel,
      relationshipTypes: card.relationshipTypes || [],
      deckIds: card.deckIds || [],
      tier: card.tier || 'FREE',
      theta: card.theta,
      status: card.status || 'active',
      languages: card.languages || ['en'],
      createdBy: card.createdBy,
      createdAt: card.createdAt,
      updatedAt: card.updatedAt,
      statistics: card.statistics
    };
  }

  /**
   * Create a new card
   * @param {Object} cardData - Card data
   * @returns {Object} Created card
   */
  async createCard(cardData) {
    const {
      error,
      value
    } = validateCard(cardData);
    if (error) {
      logger.error('Card validation error:', error.details);
      throw new AppError(`Validation error: ${error.details[0].message}`, 400);
    }

    // Set theta based on status if not provided
    if (!value.theta) {
      value.theta = value.status === 'PREMIUM' ? 0.8 : 0.3;
    }

    const card = await this.cardRepository.create(value);

    // Update deck card counts if card has deck associations
    if (card.deckIds && card.deckIds.length > 0) {
      await Promise.all(
        card.deckIds.map((deckId) => this.updateDeckCardCount(deckId))
      );
    }

    return card;
  }

  /**
   * Get card by ID
   * @param {string} cardId - Card ID
   * @param {string} language - Preferred language
   * @returns {Object} Card object
   */
  async getCardById(cardId, language = 'en') {
    const card = await this.cardRepository.findById(cardId);
    if (!card) {
      throw new AppError('Card not found', 404);
    }

    // Add display content for the requested language
    card.displayContent = getCardContent(card, language);
    return card;
  }

  /**
   * Get cards by filters
   * @param {Object} filters - Query filters
   * @param {string} language - Preferred language
   * @returns {Array} Array of cards
   */
  async getCardsByFilters(filters = {}, language = 'en') {
    const cards = this.cardRepository.findByFilters(filters);

    // Add display content for each card
    return cards.map((card) => ({
      ...card,
      displayContent: getCardContent(card, language)
    }));
  }

  /**
   * Get cards for multiple decks with access control
   * @param {Array} deckIds - Array of deck IDs
   * @param {Array} unlockedDeckIds - User's unlocked deck IDs
   * @param {Object} filters - Additional filters
   * @param {string} language - Preferred language
   * @returns {Array} Array of accessible cards
   */
  async getCardsForDecks(deckIds, unlockedDeckIds = [], filters = {}, language = 'en') {
    if (!deckIds || deckIds.length === 0) {
      return [];
    }

    // Get all decks to check their types
    const decks = this.deckRepository.findByIds(deckIds);

    // Get cards for all decks
    const cards = this.cardRepository.findByDeckIds(deckIds, filters);

    // Filter cards based on deck access
    const accessibleCards = cards.filter((card) => {
      // If card is FREE, always accessible
      if (card.tier === 'FREE') return true;

      // Check if user has access to any deck containing this premium card
      return card.deckIds.some((deckId) => {
        const deck = decks.find((d) => d.id === deckId);
        if (!deck) return false;

        // FREE deck or unlocked PREMIUM deck
        return deck.tier === 'FREE' || unlockedDeckIds.includes(deckId);
      });
    });

    // Add display content
    return accessibleCards.map((card) => ({
      ...card,
      displayContent: getCardContent(card, language)
    }));
  }

  /**
   * Get unassigned cards
   * @param {Object} filters - Query filters
   * @param {string} language - Preferred language
   * @returns {Array} Array of unassigned cards
   */
  async getUnassignedCards(filters = {}, language = 'en') {
    const cards = this.cardRepository.findUnassignedCards(filters);

    return cards.map((card) => ({
      ...card,
      displayContent: getCardContent(card, language)
    }));
  }

  /**
   * Update card
   * @param {string} cardId - Card ID
   * @param {Object} updateData - Update data
   * @returns {Object} Updated card
   */
  async updateCard(cardId, updateData) {
    const card = await this.cardRepository.findById(cardId);
    if (!card) {
      throw new AppError('Card not found', 404);
    }

    // Validate update data
    const {
      error,
      value
    } = validateCard({ ...card, ...updateData });
    if (error) {
      throw new AppError(`Validation error: ${error.details[0].message}`, 400);
    }

    const updatedCard = await this.cardRepository.update(cardId, updateData);

    // Update deck card counts if deck associations changed
    const oldDeckIds = card.deckIds || [];
    const newDeckIds = updatedCard.deckIds || [];

    const addedDecks = newDeckIds.filter((id) => !oldDeckIds.includes(id));
    const removedDecks = oldDeckIds.filter((id) => !newDeckIds.includes(id));

    const affectedDecks = [...new Set([...addedDecks, ...removedDecks])];

    if (affectedDecks.length > 0) {
      await Promise.all(
        affectedDecks.map((deckId) => this.updateDeckCardCount(deckId))
      );
    }

    return updatedCard;
  }

  /**
   * Update deck card count
   * @param {string} deckId - Deck ID
   * @private
   */
  async updateDeckCardCount(deckId) {
    const cards = this.cardRepository.findByDeckId(deckId);

    const cardCount = {
      total: cards.length,
      free: cards.filter((c) => c.tier === 'FREE').length,
      premium: cards.filter((c) => c.tier === 'PREMIUM').length
    };

    await this.deckRepository.updateCardCount(deckId, cardCount);
  }

  /**
   * Record card drawn
   * @param {string} cardId - Card ID
   * @param {string} language - Language used
   */
  async recordCardDrawn(cardId, language = 'en') {
    await this.cardRepository.incrementLanguageUsage(cardId, language);
  }

  /**
   * Record card skipped
   * @param {string} cardId - Card ID
   */
  async recordCardSkipped(cardId) {
    const card = await this.cardRepository.findById(cardId);
    if (!card) {
      throw new AppError('Card not found', 404);
    }

    const statistics = card.statistics || {};
    const timesDrawn = statistics.timesDrawn || 0;
    const currentSkips = Math.round((statistics.skipRate || 0) * timesDrawn);

    statistics.skipRate = timesDrawn > 0 ? (currentSkips + 1) / (timesDrawn + 1) : 1;

    await this.cardRepository.updateStatistics(cardId, statistics);
  }

  /**
   * Bulk create cards
   * @param {Array} cardsData - Array of card data
   * @returns {Array} Created cards
   */
  async bulkCreateCards(cardsData) {
    // Validate all cards
    const validatedCards = [];
    for (const cardData of cardsData) {
      const {
        error,
        value
      } = validateCard(cardData);
      if (error) {
        throw new AppError(`Validation error in card: ${error.details[0].message}`, 400);
      }

      // Set theta if not provided
      if (!value.theta) {
        value.theta = value.status === 'PREMIUM' ? 0.8 : 0.3;
      }

      validatedCards.push(value);
    }

    const cards = this.cardRepository.bulkCreate(validatedCards);

    // Update deck card counts
    const affectedDeckIds = new Set();
    cards.forEach((card) => {
      if (card.deckIds) {
        card.deckIds.forEach((deckId) => affectedDeckIds.add(deckId));
      }
    });

    await Promise.all(
      Array.from(affectedDeckIds)
        .map((deckId) => this.updateDeckCardCount(deckId))
    );

    return cards;
  }

  /**
   * Delete card
   * @param {string} cardId - Card ID
   */
  async deleteCard(cardId) {
    const card = await this.cardRepository.findById(cardId);
    if (!card) {
      throw new AppError('Card not found', 404);
    }

    // Delete the card
    await this.cardRepository.delete(cardId);

    // Update deck card counts
    if (card.deckIds && card.deckIds.length > 0) {
      await Promise.all(
        card.deckIds.map((deckId) => this.updateDeckCardCount(deckId))
      );
    }
  }
}

module.exports = CardService;
