const DeckService = require('../services/deckService');
const CardService = require('../services/cardService');
const SessionService = require('../services/sessionService');
const { AppError } = require('../middleware/errorHandler');

class AdminController {
  constructor() {
    this.deckService = new DeckService();
    this.cardService = new CardService();
    this.sessionService = new SessionService();
  }

  // Deck Management

  /**
   * Find All
   * POST /api/v1/admin/decks
   */
  adminFindAll = async (req, res) => {
    const {filters} = req.query;
    const decks = await this.deckService.adminFindAll(filters);

    res.status(201)
      .json({
        status: 'success',
        data: {
          decks,
          totals: decks.length,
        }
      });
  };

  /**
   * Create new deck
   * POST /api/v1/admin/decks
   */
  adminCreateDeck = async (req, res) => {
    const deck = await this.deckService.createDeck({
      ...req.body,
      createdBy: req.user.uid
    });

    res.status(201)
      .json({
        status: 'success',
        data: {
          deck,
          message: 'Deck created successfully'
        }
      });
  };

  /**
   * Get deck by Id
   * POST /api/v1/admin/decks/:id
   */
  adminFindById = async (req, res) => {
    const { id } = req.params;
    const deck = await this.deckService.getDeckById(id);

    res.status(200)
      .json({
        status: 'success',
        data: {
          deck,
        }
      });
  };

  /**
   * Update deck
   * PATCH /api/admin/decks/:id
   */
  adminUpdateDeck = async (req, res) => {
    const { id } = req.params;

    const deck = await this.deckService.updateDeck(id, req.body);

    res.status(200)
      .json({
        status: 'success',
        data: {
          deck,
          message: 'Deck updated successfully'
        }
      });
  };

  /**
   * Delete deck
   * DELETE /api/v1/admin/decks/:id
   */
  adminDeleteDeck = async (req, res) => {
    const { id } = req.params;

    await this.deckService.deleteDeck(id);

    res.status(200)
      .json({
        status: 'success',
        data: {
          message: 'Deck deleted successfully'
        }
      });
  };

  /**
   * Add cards to deck
   * POST /api/v1/admin/decks/:id/cards
   */
  adminAddCardsToDeck = async (req, res) => {
    const { id } = req.params;
    const { cardIds } = req.body;

    if (!cardIds || !Array.isArray(cardIds)) {
      throw new AppError('Card IDs array is required', 400);
    }

    await this.deckService.addCardsToDeck(id, cardIds);

    res.status(200)
      .json({
        status: 'success',
        data: {
          message: `${cardIds.length} cards added to deck`
        }
      });
  };

  /**
   * Remove cards from deck
   * DELETE /api/v1/admin/decks/:id/cards
   */
  adminRemoveCardsFromDeck = async (req, res) => {
    const { id } = req.params;
    const { cardIds } = req.body;

    if (!cardIds || !Array.isArray(cardIds)) {
      throw new AppError('Card IDs array is required', 400);
    }

    await this.deckService.removeCardsFromDeck(id, cardIds);

    res.status(200)
      .json({
        status: 'success',
        data: {
          message: `${cardIds.length} cards removed from deck`
        }
      });
  };

  // Card Management

  /**
   * Create new card
   * POST /api/v1/admin/cards
   */
  adminCreateCard = async (req, res) => {
    const card = await this.cardService.createCard({
      ...req.body,
      createdBy: req.user.uid
    });

    res.status(201)
      .json({
        status: 'success',
        data: {
          card,
          message: 'Card created successfully'
        }
      });
  };

  /**
   * Update card
   * PATCH /api/v1/admin/cards/:id
   */
  adminUpdateCard = async (req, res) => {
    const { id } = req.params;

    const card = await this.cardService.updateCard(id, req.body);

    res.status(200)
      .json({
        status: 'success',
        data: {
          card,
          message: 'Card updated successfully'
        }
      });
  };

  /**
   * Delete card
   * DELETE /api/v1/admin/cards/:id
   */
  adminDeleteCard = async (req, res) => {
    const { id } = req.params;

    await this.cardService.deleteCard(id);

    res.status(200)
      .json({
        status: 'success',
        data: {
          message: 'Card deleted successfully'
        }
      });
  };

  /**
   * Bulk create cards
   * POST /api/v1/admin/cards/bulk
   */
  adminBulkCreateCards = async (req, res) => {
    const { cards } = req.body;

    if (!cards || !Array.isArray(cards)) {
      throw new AppError('Cards array is required', 400);
    }

    const createdCards = this.cardService.bulkCreateCards(
      cards.map(card => ({
        ...card,
        createdBy: req.user.uid
      }))
    );

    res.status(201)
      .json({
        status: 'success',
        data: {
          count: createdCards.length,
          cards: createdCards,
          message: `${createdCards.length} cards created successfully`
        }
      });
  };

  /**
   * Generate cards with AI
   * POST /api/v1/admin/cards/generate
   */
  adminGenerateCards = async (req, res) => {
    const {
      relationshipType,
      connectionLevel,
      count = 5,
      theta = 0.5,
      targetLanguages = ['en'],
      deckId
    } = req.body;

    if (!relationshipType || !connectionLevel) {
      throw new AppError('Relationship type and connection level are required', 400);
    }

    // TODO: Implement AI generation service
    // This is a placeholder response
    res.status(200)
      .json({
        status: 'success',
        data: {
          message: 'AI generation endpoint - to be implemented',
          parameters: {
            relationshipType,
            connectionLevel,
            count,
            theta,
            targetLanguages,
            deckId
          }
        }
      });
  };

  // Analytics

  /**
   * Get system analytics
   * GET /api/v1/admin/analytics
   */
  adminGetAnalytics = async (req, res) => {
    const {
      startDate,
      endDate,
      type = 'overview'
    } = req.query;

    const filters = {};
    if (startDate) filters.startDate = new Date(startDate);
    if (endDate) filters.endDate = new Date(endDate);

    // Get session analytics
    const sessionAnalytics = await this.sessionService.sessionRepository.getAnalytics(filters);

    // TODO: Add more analytics (deck performance, card performance, revenue)

    res.status(200)
      .json({
        status: 'success',
        data: {
          type,
          dateRange: {
            start: filters.startDate || 'all time',
            end: filters.endDate || 'present'
          },
          sessions: sessionAnalytics
        }
      });
  };

  /**
   * Get deck analytics
   * GET /api/v1/admin/analytics/decks/:id
   */
  adminGetDeckAnalytics = async (req, res) => {
    const { id } = req.params;

    const statistics = await this.deckService.getDeckStatistics(id);

    res.status(200)
      .json({
        status: 'success',
        data: { statistics }
      });
  };
}

module.exports = new AdminController();
