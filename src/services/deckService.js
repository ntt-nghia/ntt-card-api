const DeckRepository = require('../repositories/deckRepository');
const CardRepository = require('../repositories/cardRepository');
const UserRepository = require('../repositories/userRepository');
const { validateDeck } = require('../models/Deck');
const { AppError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

class DeckService {
  constructor() {
    this.deckRepository = new DeckRepository();
    this.cardRepository = new CardRepository();
    this.userRepository = new UserRepository();
  }

  /**
   * Create a new deck
   * @param {Object} deckData - Deck data
   * @returns {Object} Created deck
   */
  createDeck = async deckData => {
    const {
      error,
      value
    } = validateDeck(deckData);
    if (error) {
      logger.error('Deck validation error:', error.details);
      throw new AppError(`Validation error: ${error.details[0].message}`, 400);
    }

    return await this.deckRepository.create(value);
  };

  /**
   * Get deck by ID
   * @param {string} deckId - Deck ID
   * @param {string} userId - User ID (optional, for access check)
   * @returns {Object} Deck with access info
   */
  getDeckById = async (deckId, userId = null) => {
    const deck = await this.deckRepository.findById(deckId);
    if (!deck) {
      throw new AppError('Deck not found', 404);
    }

    // Add access information if userId provided
    if (userId) {
      const user = await this.userRepository.findById(userId);
      deck.hasAccess = this.userHasAccessToDeck(deck, user);
      deck.isUnlocked = user?.unlockedDecks?.includes(deckId) || false;
    }

    return deck;
  };

  /**
   * Get all decks for a relationship type
   * @param {string} relationshipType - Relationship type
   * @param {string} userId - User ID (optional)
   * @returns {Array} Array of decks
   */
  getDecksByRelationshipType = async (relationshipType, userId = null) => {
    const decks = await this.deckRepository.findByRelationshipType(relationshipType);

    // Add access information if userId provided
    if (userId) {
      const user = await this.userRepository.findById(userId);
      return decks.map(deck => ({
        ...deck,
        hasAccess: this.userHasAccessToDeck(deck, user),
        isUnlocked: user?.unlockedDecks?.includes(deck.id) || false
      }));
    }

    return decks;
  };

  /**
   * Get decks available to user
   * @param {string} userId - User ID
   * @param {Object} filters - Additional filters
   * @returns {Array} Array of accessible decks
   */
  getUserAvailableDecks = async (userId, filters = {}) => {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    const allDecks = await this.deckRepository.findAll({
      ...filters,
      status: 'active'
    });

    // Filter and enhance with access info
    return allDecks.map(deck => ({
      ...deck,
      hasAccess: this.userHasAccessToDeck(deck, user),
      isUnlocked: user.unlockedDecks?.includes(deck.id) || false
    }));
  };

  /**
   * Check if user has access to deck
   * @param {Object} deck - Deck object
   * @param {Object} user - User object
   * @returns {boolean} Has access
   */
  userHasAccessToDeck = (deck, user) => {
    if (!deck || !user) return false;
    return deck.tier === 'FREE' || user.unlockedDecks?.includes(deck.id);
  };

  /**
   * Unlock deck for user
   * @param {string} userId - User ID
   * @param {string} deckId - Deck ID
   * @param {Object} purchaseData - Purchase information
   * @returns {Object} Updated user
   */
  unlockDeck = async (userId, deckId, purchaseData = {}) => {
    // Verify deck exists and is premium
    const deck = await this.deckRepository.findById(deckId);
    if (!deck) {
      throw new AppError('Deck not found', 404);
    }

    if (deck.tier !== 'PREMIUM') {
      throw new AppError('Deck is already free', 400);
    }

    // Check if already unlocked
    const user = await this.userRepository.findById(userId);
    if (user.unlockedDecks?.includes(deckId)) {
      throw new AppError('Deck already unlocked', 400);
    }

    // Add to unlocked decks
    await this.userRepository.addUnlockedDeck(userId, deckId);

    // Record purchase
    await this.userRepository.addPurchaseHistory(userId, {
      deckId,
      amount: deck.price || 0,
      currency: deck.currency || 'USD',
      ...purchaseData
    });

    // Update deck statistics
    await this.deckRepository.incrementPurchases(deckId);

    return await this.userRepository.findById(userId);
  };

  /**
   * Get cards for a deck
   * @param {string} deckId - Deck ID
   * @param {string} userId - User ID (for filtering premium content)
   * @param {Object} filters - Additional filters
   * @returns {Array} Array of cards
   */
  getDeckCards = async (deckId, userId = null, filters = {}) => {
    const deck = await this.getDeckById(deckId, userId);

    // Get all cards for the deck
    let cards = await this.cardRepository.findByDeckId(deckId, filters);

    // Filter premium cards if user doesn't have access
    if (userId && !deck.hasAccess) {
      cards = cards.filter(card => card.tier === 'FREE');
    }

    return cards;
  };

  /**
   * Update deck
   * @param {string} deckId - Deck ID
   * @param {Object} updateData - Update data
   * @returns {Object} Updated deck
   */
  updateDeck = async (deckId, updateData) => {
    const deck = await this.deckRepository.findById(deckId);
    if (!deck) {
      throw new AppError('Deck not found', 404);
    }

    // Validate update data
    const {
      error,
      value
    } = validateDeck({ ...deck, ...updateData });
    if (error) {
      throw new AppError(`Validation error: ${error.details[0].message}`, 400);
    }

    return await this.deckRepository.update(deckId, updateData);
  };

  /**
   * Update deck card count
   * @param {string} deckId - Deck ID
   */
  updateDeckCardCount = async deckId => {
    const cards = await this.cardRepository.findByDeckId(deckId);

    const cardCount = {
      total: cards.length,
      free: cards.filter(c => c.tier === 'FREE').length,
      premium: cards.filter(c => c.tier === 'PREMIUM').length
    };

    await this.deckRepository.updateCardCount(deckId, cardCount);
    return cardCount;
  };

  /**
   * Add cards to deck
   * @param {string} deckId - Deck ID
   * @param {Array} cardIds - Array of card IDs
   */
  addCardsToDeck = async (deckId, cardIds) => {
    const deck = await this.deckRepository.findById(deckId);
    if (!deck) {
      throw new AppError('Deck not found', 404);
    }

    // Add each card to the deck
    await Promise.all(
      cardIds.map(cardId => this.cardRepository.addToDeck(cardId, deckId))
    );

    // Update card count
    await this.updateDeckCardCount(deckId);
  };

  /**
   * Remove cards from deck
   * @param {string} deckId - Deck ID
   * @param {Array} cardIds - Array of card IDs
   */
  removeCardsFromDeck = async (deckId, cardIds) => {
    await Promise.all(
      cardIds.map(cardId => this.cardRepository.removeFromDeck(cardId, deckId))
    );

    // Update card count
    await this.updateDeckCardCount(deckId);
  };

  /**
   * Get deck statistics
   * @param {string} deckId - Deck ID
   * @returns {Object} Deck statistics
   */
  getDeckStatistics = async deckId => {
    const deck = await this.deckRepository.findById(deckId);
    if (!deck) {
      throw new AppError('Deck not found', 404);
    }

    // Get users who unlocked this deck
    const unlockedUsers = await this.userRepository.findByUnlockedDeck(deckId);

    // Get cards statistics
    const cards = await this.cardRepository.findByDeckId(deckId);
    const totalDraws = cards.reduce((sum, card) =>
      sum + (card.statistics?.timesDrawn || 0), 0
    );
    const avgSkipRate = cards.reduce((sum, card) =>
      sum + (card.statistics?.skipRate || 0), 0
    ) / cards.length;

    return {
      ...deck.statistics,
      totalUsers: unlockedUsers.length,
      totalCards: cards.length,
      totalDraws,
      averageSkipRate: avgSkipRate,
      revenue: deck.price * (deck.statistics?.purchases || 0)
    };
  };

  /**
   * Delete deck
   * @param {string} deckId - Deck ID
   */
  deleteDeck = async deckId => {
    // Remove deck reference from all cards
    const cards = await this.cardRepository.findByDeckId(deckId);
    await Promise.all(
      cards.map(card => this.cardRepository.removeFromDeck(card.id, deckId))
    );

    // Delete the deck
    await this.deckRepository.delete(deckId);
  };

  adminFindAll = async filters => this.deckRepository.findAll(filters);
}

module.exports = DeckService;
