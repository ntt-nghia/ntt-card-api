const DeckService = require('../services/deckService');
const { AppError } = require('../middleware/errorHandler');

class DeckController {
  constructor() {
    this.deckService = new DeckService();
  }

  /**
   * Get all decks
   * GET /api/decks?relationshipType=friends&type=FREE
   */
  getAllDecks = async (req, res) => {
    const { relationshipType, type } = req.query;
    const userId = req.user?.uid; // Optional auth

    const filters = {};
    if (relationshipType) filters.relationshipType = relationshipType;
    if (type) filters.type = type;

    const decks = userId
      ? this.deckService.getUserAvailableDecks(userId, filters)
      : this.deckService.deckRepository.findAll(filters);

    res.status(200).json({
      status: 'success',
      data: {
        count: decks.length,
        decks
      }
    });
  };

  /**
   * Get deck by ID
   * GET /api/decks/:id
   */
  getDeckById = async (req, res) => {
    const { id } = req.params;
    const userId = req.user?.uid;

    const deck = await this.deckService.getDeckById(id, userId);

    res.status(200).json({
      status: 'success',
      data: { deck }
    });
  };

  /**
   * Get deck cards
   * GET /api/decks/:id/cards
   */
  getDeckCards = async (req, res) => {
    const { id } = req.params;
    const userId = req.user?.uid;
    const { connectionLevel, type } = req.query;

    const filters = {};
    if (connectionLevel) filters.connectionLevel = parseInt(connectionLevel);
    if (type) filters.type = type;

    const cards = this.deckService.getDeckCards(id, userId, filters);

    res.status(200).json({
      status: 'success',
      data: {
        count: cards.length,
        cards
      }
    });
  };

  /**
   * Unlock deck for user
   * POST /api/decks/:id/unlock
   */
  unlockDeck = async (req, res) => {
    const { id } = req.params;
    const userId = req.user.uid;
    const { transactionId, paymentMethod } = req.body;

    // In production, verify payment with payment processor here
    if (!transactionId) {
      throw new AppError('Transaction ID required', 400);
    }

    const user = await this.deckService.unlockDeck(userId, id, {
      transactionId,
      paymentMethod: paymentMethod || 'stripe'
    });

    res.status(200).json({
      status: 'success',
      data: {
        message: 'Deck unlocked successfully',
        unlockedDecks: user.unlockedDecks
      }
    });
  };

  /**
   * Get deck statistics
   * GET /api/decks/:id/statistics
   */
  getDeckStatistics = async (req, res) => {
    const { id } = req.params;

    const statistics = await this.deckService.getDeckStatistics(id);

    res.status(200).json({
      status: 'success',
      data: { statistics }
    });
  };
}

module.exports = new DeckController();
