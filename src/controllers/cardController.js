const CardService = require('../services/cardService');
const DeckService = require('../services/deckService');

class CardController {
  constructor() {
    this.cardService = new CardService();
    this.deckService = new DeckService();
  }

  /**
   * Get cards with filters
   * GET /api/cards?relationshipType=friends&connectionLevel=1
   */
  getCards = async (req, res) => {
    const {
      relationshipType,
      connectionLevel,
      type,
      status,
      deckId,
      language = 'en'
    } = req.query;

    const filters = {};
    if (relationshipType) filters.relationshipType = relationshipType;
    if (connectionLevel) filters.connectionLevel = parseInt(connectionLevel);
    if (type) filters.type = type;
    if (status) filters.status = status;

    let cards;
    if (deckId) {
      // Get cards for specific deck
      const userId = req.user?.uid;
      cards = this.deckService.getDeckCards(deckId, userId, filters);
    } else {
      cards = this.cardService.getCardsByFilters(filters, language);
    }

    res.status(200).json({
      status: 'success',
      data: {
        count: cards.length,
        cards
      }
    });
  };

  /**
   * Get card by ID
   * GET /api/cards/:id
   */
  getCardById = async (req, res) => {
    const { id } = req.params;
    const { language = 'en' } = req.query;

    const card = await this.cardService.getCardById(id, language);

    res.status(200).json({
      status: 'success',
      data: { card }
    });
  };

  /**
   * Get unassigned cards
   * GET /api/cards/unassigned
   */
  getUnassignedCards = async (req, res) => {
    const { relationshipType, language = 'en' } = req.query;

    const filters = {};
    if (relationshipType) filters.relationshipType = relationshipType;

    const cards = this.cardService.getUnassignedCards(filters, language);

    res.status(200).json({
      status: 'success',
      data: {
        count: cards.length,
        cards
      }
    });
  };
}

module.exports = new CardController();
