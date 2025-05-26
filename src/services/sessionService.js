const GameSessionRepository = require('../repositories/gameSessionRepository');
const CardService = require('./cardService');
const UserService = require('./userService');
const DeckService = require('./deckService');
const { validateGameSession, calculateSessionStats, canDrawCard } = require('../models/GameSession');
const { AppError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

class SessionService {
  constructor() {
    this.sessionRepository = new GameSessionRepository();
    this.cardService = new CardService();
    this.userService = new UserService();
    this.deckService = new DeckService();
  }

  /**
   * Start a new game session
   * @param {Object} sessionData - Session data
   * @returns {Object} Created session
   */
  async startSession(sessionData) {
    const { error, value } = validateGameSession(sessionData);
    if (error) {
      logger.error('Session validation error:', error.details);
      throw new AppError(`Validation error: ${error.details[0].message}`, 400);
    }

    // Verify host exists
    const host = await this.userService.getUserById(value.hostId);
    if (!host) {
      throw new AppError('Host not found', 404);
    }

    // Set language from user preference or session data
    value.language = value.language || host.language || 'en';

    // Build available card pool
    value.availableCardPool = this.buildCardPool(
      value.selectedDeckIds,
      host.unlockedDecks || [],
      value.relationshipType,
      value.configuration
    );

    if (value.availableCardPool.length === 0) {
      throw new AppError('No cards available for selected configuration', 400);
    }

    // Create session
    const session = await this.sessionRepository.create(value);

    // Update user statistics
    await this.userService.recordSession(host.uid, {
      relationshipType: value.relationshipType,
      duration: 0,
      sessionId: session.id
    });

    return session;
  }

  /**
   * Build card pool for session
   * @param {Array} selectedDeckIds - Selected deck IDs
   * @param {Array} unlockedDeckIds - User's unlocked deck IDs
   * @param {string} relationshipType - Relationship type
   * @param {Object} configuration - Session configuration
   * @returns {Array} Array of card IDs
   * @private
   */
  async buildCardPool(selectedDeckIds, unlockedDeckIds, relationshipType, configuration) {
    let cardIds = [];

    // Get cards from selected decks
    if (selectedDeckIds && selectedDeckIds.length > 0) {
      const deckCards = this.cardService.getCardsForDecks(
        selectedDeckIds,
        unlockedDeckIds,
        { relationshipType }
      );
      cardIds = deckCards.map((card) => card.id);
    }

    // Include unassigned cards if configured
    if (configuration.includeUnassignedCards) {
      const unassignedCards = this.cardService.getUnassignedCards({
        relationshipType
      });

      // Filter by access (only FREE unassigned cards)
      const freeUnassignedCards = unassignedCards
        .filter((card) => card.status === 'FREE')
        .map((card) => card.id);

      cardIds = [...new Set([...cardIds, ...freeUnassignedCards])];
    }

    return cardIds;
  }

  /**
   * Get session by ID
   * @param {string} sessionId - Session ID
   * @returns {Object} Session object
   */
  async getSessionById(sessionId) {
    const session = await this.sessionRepository.findById(sessionId);
    if (!session) {
      throw new AppError('Session not found', 404);
    }

    return session;
  }

  /**
   * Draw next card for session
   * @param {string} sessionId - Session ID
   * @returns {Object} Drawn card
   */
  async drawCard(sessionId) {
    const session = await this.getSessionById(sessionId);

    if (!canDrawCard(session)) {
      throw new AppError('Cannot draw card: no cards available or session not active', 400);
    }

    // Get available cards (not yet drawn)
    const availableCardIds = session.availableCardPool.filter(
      (cardId) => !session.drawnCards.includes(cardId)
    );

    if (availableCardIds.length === 0) {
      throw new AppError('No more cards available', 400);
    }

    // Filter by current connection level
    const levelAppropriateCards = this.filterCardsByLevel(
      availableCardIds,
      session.currentLevel
    );

    if (levelAppropriateCards.length === 0) {
      throw new AppError('No cards available for current connection level', 400);
    }

    // Randomly select a card
    const randomIndex = Math.floor(Math.random() * levelAppropriateCards.length);
    const selectedCardId = levelAppropriateCards[randomIndex];

    // Get card with content
    const card = await this.cardService.getCardById(selectedCardId, session.language);

    // Update session
    await this.sessionRepository.addDrawnCard(sessionId, selectedCardId);

    // Record card drawn
    await this.cardService.recordCardDrawn(selectedCardId, session.language);

    // Update session status if first card
    if (session.drawnCards.length === 0) {
      await this.sessionRepository.update(sessionId, { status: 'active' });
    }

    return card;
  }

  /**
   * Filter cards by connection level
   * @param {Array} cardIds - Card IDs to filter
   * @param {number} maxLevel - Maximum connection level
   * @returns {Array} Filtered card IDs
   * @private
   */
  async filterCardsByLevel(cardIds, maxLevel) {
    const cards = await Promise.all(
      cardIds.map((id) => this.cardService.getCardById(id))
    );

    return cards
      .filter((card) => card.connectionLevel <= maxLevel)
      .map((card) => card.id);
  }

  /**
   * Mark card as completed
   * @param {string} sessionId - Session ID
   * @param {string} cardId - Card ID
   * @returns {Object} Updated session
   */
  async completeCard(sessionId, cardId) {
    const session = await this.getSessionById(sessionId);

    if (!session.drawnCards.includes(cardId)) {
      throw new AppError('Card not drawn in this session', 400);
    }

    if (session.completedCards.includes(cardId)) {
      throw new AppError('Card already completed', 400);
    }

    await this.sessionRepository.addCompletedCard(sessionId, cardId);

    // Check for level progression
    return await this.checkLevelProgression(sessionId);
  }

  /**
   * Mark card as skipped
   * @param {string} sessionId - Session ID
   * @param {string} cardId - Card ID
   * @returns {Object} Updated session
   */
  async skipCard(sessionId, cardId) {
    const session = await this.getSessionById(sessionId);

    if (!session.drawnCards.includes(cardId)) {
      throw new AppError('Card not drawn in this session', 400);
    }

    if (session.skippedCards.includes(cardId)) {
      throw new AppError('Card already skipped', 400);
    }

    await this.sessionRepository.addSkippedCard(sessionId, cardId);

    // Record skip in card statistics
    await this.cardService.recordCardSkipped(cardId);

    return await this.getSessionById(sessionId);
  }

  /**
   * Check and update level progression
   * @param {string} sessionId - Session ID
   * @returns {Object} Updated session
   * @private
   */
  async checkLevelProgression(sessionId) {
    const session = await this.getSessionById(sessionId);
    const stats = calculateSessionStats(session);

    // Progress to next level after completing certain number of cards
    const cardsPerLevel = 5; // Configurable
    const targetLevel = Math.min(
      Math.floor(stats.completedCards / cardsPerLevel) + 1,
      4 // Max level
    );

    if (targetLevel > session.currentLevel) {
      await this.sessionRepository.update(sessionId, {
        currentLevel: targetLevel
      });

      // Record level progression time
      const analytics = session.analytics || {};
      analytics.levelProgressionTime = analytics.levelProgressionTime || {};
      analytics.levelProgressionTime[targetLevel] = new Date() - new Date(session.startedAt);

      await this.sessionRepository.update(sessionId, { analytics });
    }

    return await this.getSessionById(sessionId);
  }

  /**
   * End game session
   * @param {string} sessionId - Session ID
   * @returns {Object} Session statistics
   */
  async endSession(sessionId) {
    const session = await this.getSessionById(sessionId);

    if (session.status === 'completed') {
      throw new AppError('Session already ended', 400);
    }

    const endTime = new Date();
    const duration = endTime - new Date(session.startedAt);

    // Update session
    await this.sessionRepository.update(sessionId, {
      status: 'completed',
      endedAt: endTime,
      'analytics.totalDuration': duration
    });

    // Calculate final statistics
    const stats = calculateSessionStats({
      ...session,
      endedAt: endTime
    });

    // Update user statistics
    await this.userService.recordGamePlayed(session.hostId, {
      relationshipType: session.relationshipType,
      connectionLevel: session.currentLevel,
      sessionDuration: duration
    });

    // Update deck statistics
    for (const deckId of session.selectedDeckIds) {
      await this.updateDeckSessionStats(deckId, stats);
    }

    return stats;
  }

  /**
   * Update deck session statistics
   * @param {string} deckId - Deck ID
   * @param {Object} sessionStats - Session statistics
   * @private
   */
  async updateDeckSessionStats(deckId, sessionStats) {
    try {
      const deck = await this.deckService.getDeckById(deckId);
      const statistics = deck.statistics || {};

      statistics.sessionsPlayed = (statistics.sessionsPlayed || 0) + 1;
      statistics.lastPlayedAt = new Date();

      // Update average completion rate
      const currentAvg = statistics.averageCompletion || 0;
      statistics.averageCompletion = ((currentAvg * (statistics.sessionsPlayed - 1)) + sessionStats.completionRate) / statistics.sessionsPlayed;

      await this.deckService.deckRepository.updateStatistics(deckId, statistics);
    }
    catch (error) {
      logger.error('Error updating deck statistics:', error);
      // Don't throw - this is non-critical
    }
  }

  /**
   * Get active sessions for user
   * @param {string} userId - User ID
   * @returns {Array} Active sessions
   */
  async getUserActiveSessions(userId) {
    return this.sessionRepository.findByHostId(userId, { status: 'active' });
  }

  /**
   * Get session statistics
   * @param {string} sessionId - Session ID
   * @returns {Object} Session statistics
   */
  async getSessionStatistics(sessionId) {
    const session = await this.getSessionById(sessionId);
    return calculateSessionStats(session);
  }
}

module.exports = SessionService;
