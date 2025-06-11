const DeckService = require('../services/deckService');
const CardService = require('../services/cardService');
const SessionService = require('../services/sessionService');
const { AppError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');
const AIGenerationService = require('../services/aiGenerationService');

class AdminController {
  constructor() {
    this.deckService = new DeckService();
    this.cardService = new CardService();
    this.sessionService = new SessionService();
    this.aiGenerationService = new AIGenerationService();
  }

  // Deck Management

  /**
   * Find All
   * POST /api/v1/admin/decks
   */
  adminFindAll = async (req, res) => {
    const { filters } = req.query;
    const decks = await this.deckService.adminFindAll(filters);

    res.status(201)
      .json({
        status: 'success',
        data: {
          decks,
          totals: decks.length
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
          deck
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
   * Generate AI-powered cards with advanced features
   * Implements: duplication prevention, cost optimization, quality control
   */
  adminGenerateCards = async (req, res, next) => {
    try {
      const {
        relationshipType,
        connectionLevel,
        count = 5,
        theta = 0.5,
        targetLanguages = ['en'],
        deckId,
        preview = false,
        batchMode = false
      } = req.body;

      const userId = req.user.id;

      // Validate required parameters
      if (!relationshipType || !connectionLevel) {
        throw new AppError('Relationship type and connection level are required', 400);
      }

      // Log generation request for analytics
      logger.info('AI card generation request', {
        userId,
        relationshipType,
        connectionLevel,
        count,
        theta,
        targetLanguages,
        deckId,
        preview,
        batchMode
      });

      // Validate deck ownership/access if deckId provided
      if (deckId) {
        const deck = await this.deckService.getDeckById(deckId);
        if (!deck) {
          throw new AppError('Deck not found', 404);
        }
      }

      // Preview mode - just estimate cost and show parameters
      if (preview) {
        const costEstimate = this.aiGenerationService.estimateCost(count, theta, targetLanguages.length);

        return res.status(200)
          .json({
            success: true,
            preview: true,
            parameters: {
              relationshipType,
              connectionLevel,
              count,
              theta,
              targetLanguages,
              deckId
            },
            costEstimate,
            qualityLevel: this.getQualityDescription(theta),
            expectedDuration: this.estimateGenerationTime(count, theta),
            duplicationPrevention: 'Advanced semantic and hash-based detection enabled'
          });
      }

      // Execute AI generation
      const startTime = Date.now();

      const generationResult = await this.aiGenerationService.generateCards({
        relationshipType,
        connectionLevel,
        count,
        theta,
        targetLanguages,
        deckId,
        userId
      });

      const executionTime = Date.now() - startTime;

      // Log successful generation
      logger.info('AI generation completed', {
        userId,
        executionTime,
        generated: generationResult.generated,
        duplicatesDetected: generationResult.duplicatesDetected,
        cost: generationResult.cost
      });

      // Prepare response
      const response = {
        success: true,
        message: `Successfully generated ${generationResult.generated} unique cards`,
        data: {
          generated: generationResult.generated,
          requested: generationResult.requested,
          duplicatesDetected: generationResult.duplicatesDetected,
          theta: generationResult.theta,
          cost: generationResult.cost,
          executionTime: `${(executionTime / 1000).toFixed(2)}s`,
          cards: batchMode ? generationResult.cards : generationResult.cards.map(card => ({
            id: card.id,
            content: card.content,
            type: card.type,
            tier: card.tier,
            status: card.status
          }))
        },
        metadata: {
          relationshipType,
          connectionLevel,
          qualityLevel: this.getQualityDescription(theta),
          languages: targetLanguages,
          deckId
        }
      };

      // Success response
      res.status(201)
        .json(response);

    } catch (error) {
      logger.error('AI generation failed:', error);
      next(error);
    }
  };

  /**
   * Batch generate cards for multiple configurations
   */
  adminBatchGenerateCards = async (req, res, next) => {
    try {
      const {
        configurations,
        globalTheta = 0.5
      } = req.body;
      const userId = req.user.id;

      if (!Array.isArray(configurations) || configurations.length === 0) {
        throw new AppError('Configurations array is required', 400);
      }

      if (configurations.length > 10) {
        throw new AppError('Maximum 10 configurations per batch', 400);
      }

      logger.info('Batch AI generation started', {
        userId,
        configurationsCount: configurations.length,
        globalTheta
      });

      const results = [];
      let totalGenerated = 0;
      let totalCost = 0;

      for (let i = 0; i < configurations.length; i++) {
        const config = configurations[i];

        try {
          const generationResult = await this.aiGenerationService.generateCards({
            ...config,
            theta: config.theta || globalTheta,
            userId
          });

          results.push({
            configurationIndex: i,
            success: true,
            generated: generationResult.generated,
            cost: generationResult.cost,
            duplicatesDetected: generationResult.duplicatesDetected
          });

          totalGenerated += generationResult.generated;
          totalCost += generationResult.cost.totalCost;

        } catch (error) {
          logger.error(`Batch configuration ${i} failed:`, error);

          results.push({
            configurationIndex: i,
            success: false,
            error: error.message
          });
        }

        // Rate limiting between configurations
        if (i < configurations.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }

      res.status(201)
        .json({
          success: true,
          message: `Batch generation completed: ${totalGenerated} cards generated`,
          data: {
            totalConfigurations: configurations.length,
            totalGenerated,
            totalCost: parseFloat(totalCost.toFixed(4)),
            results
          }
        });

    } catch (error) {
      logger.error('Batch generation failed:', error);
      next(error);
    }
  };

  /**
   * Get AI generation analytics and usage statistics
   */
  getGenerationAnalytics = async (req, res, next) => {
    try {
      const {
        timeframe = '30d',
        groupBy = 'day'
      } = req.query;

      // Implementation would query analytics database
      // This is a placeholder for the analytics structure

      const analytics = {
        timeframe,
        totalGenerations: 0,
        totalCardsGenerated: 0,
        totalCost: 0,
        averageTheta: 0,
        duplicateDetectionRate: 0,
        topRelationshipTypes: [],
        qualityDistribution: {
          basic: 0,      // theta 0.1-0.4
          standard: 0,   // theta 0.4-0.6
          high: 0,       // theta 0.6-0.8
          premium: 0     // theta 0.8-1.0
        },
        costByModel: {
          'gemini-1.5-flash': 0,
          'gemini-1.5-pro': 0
        },
        timeline: [] // Daily/hourly breakdown based on groupBy
      };

      res.status(200)
        .json({
          success: true,
          data: analytics
        });

    } catch (error) {
      logger.error('Failed to get generation analytics:', error);
      next(error);
    }
  };

  /**
   * Validate and approve AI-generated cards
   */
  approveGeneratedCards = async (req, res, next) => {
    try {
      const {
        cardIds,
        action = 'approve'
      } = req.body; // approve, reject, edit
      const userId = req.user.id;

      if (!Array.isArray(cardIds) || cardIds.length === 0) {
        throw new AppError('Card IDs array is required', 400);
      }

      const results = [];

      for (const cardId of cardIds) {
        try {
          const card = await this.cardService.getCardById(cardId);

          if (!card) {
            results.push({
              cardId,
              success: false,
              error: 'Card not found'
            });
            continue;
          }

          if (card.status !== 'review') {
            results.push({
              cardId,
              success: false,
              error: 'Card not in review status'
            });
            continue;
          }

          let updatedCard;

          switch (action) {
            case 'approve':
              updatedCard = await this.cardService.updateCard(cardId, {
                status: 'active',
                reviewedBy: userId,
                reviewedAt: new Date()
              });
              break;

            case 'reject':
              updatedCard = await this.cardService.updateCard(cardId, {
                status: 'archived',
                reviewedBy: userId,
                reviewedAt: new Date()
              });
              break;

            default:
              throw new AppError('Invalid action', 400);
          }

          results.push({
            cardId,
            success: true,
            newStatus: updatedCard.status
          });

        } catch (error) {
          results.push({
            cardId,
            success: false,
            error: error.message
          });
        }
      }

      const successCount = results.filter(r => r.success).length;

      res.status(200)
        .json({
          success: true,
          message: `${action} completed for ${successCount}/${cardIds.length} cards`,
          data: { results }
        });

    } catch (error) {
      logger.error('Card approval failed:', error);
      next(error);
    }
  };

  /**
   * Get cards pending review
   */
  getPendingReviewCards = async (req, res, next) => {
    try {
      const {
        relationshipType,
        connectionLevel,
        limit = 50,
        offset = 0,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = req.query;

      const filters = {
        status: 'review',
        ...(relationshipType && { relationshipTypes: [relationshipType] }),
        ...(connectionLevel && { connectionLevel: parseInt(connectionLevel) })
      };

      const cards = await this.cardService.getCardsByFilters(filters);

      // Sort and paginate
      const sortedCards = cards.sort((a, b) => {
        const aVal = a[sortBy];
        const bVal = b[sortBy];

        if (sortOrder === 'desc') {
          return bVal > aVal ? 1 : -1;
        }
        return aVal > bVal ? 1 : -1;
      });

      const paginatedCards = sortedCards.slice(offset, offset + limit);

      res.status(200)
        .json({
          success: true,
          data: {
            cards: paginatedCards,
            pagination: {
              total: cards.length,
              limit: parseInt(limit),
              offset: parseInt(offset),
              hasMore: offset + limit < cards.length
            }
          }
        });

    } catch (error) {
      logger.error('Failed to get pending cards:', error);
      next(error);
    }
  };

  /**
   * Regenerate specific cards with new parameters
   */
  regenerateCards = async (req, res, next) => {
    try {
      const {
        cardIds,
        newTheta,
        newTargetLanguages
      } = req.body;
      const userId = req.user.id;

      if (!Array.isArray(cardIds) || cardIds.length === 0) {
        throw new AppError('Card IDs array is required', 400);
      }

      const results = [];

      for (const cardId of cardIds) {
        try {
          const originalCard = await this.cardService.getCardById(cardId);

          if (!originalCard) {
            results.push({
              cardId,
              success: false,
              error: 'Original card not found'
            });
            continue;
          }

          // Generate new version
          const generationResult = await this.aiGenerationService.generateCards({
            relationshipType: originalCard.relationshipTypes[0],
            connectionLevel: originalCard.connectionLevel,
            count: 1,
            theta: newTheta || originalCard.theta || 0.5,
            targetLanguages: newTargetLanguages || ['en'],
            userId
          });

          if (generationResult.cards.length > 0) {
            // Archive original card
            await this.cardService.updateCard(cardId, {
              status: 'archived',
              replacedBy: generationResult.cards[0].id,
              replacedAt: new Date()
            });

            results.push({
              cardId,
              success: true,
              newCardId: generationResult.cards[0].id,
              newCard: generationResult.cards[0]
            });
          }
          else {
            results.push({
              cardId,
              success: false,
              error: 'Failed to generate replacement card'
            });
          }

        } catch (error) {
          results.push({
            cardId,
            success: false,
            error: error.message
          });
        }
      }

      res.status(200)
        .json({
          success: true,
          message: `Regeneration completed for ${results.filter(r => r.success).length}/${cardIds.length} cards`,
          data: { results }
        });

    } catch (error) {
      logger.error('Card regeneration failed:', error);
      next(error);
    }
  };

  /**
   * Helper: Get quality description from theta value
   * @param {number} theta - Quality coefficient
   * @returns {string} Quality description
   */
  getQualityDescription(theta) {
    if (theta >= 0.8) return 'Premium';
    if (theta >= 0.6) return 'High';
    if (theta >= 0.4) return 'Standard';
    return 'Basic';
  }

  /**
   * Helper: Estimate generation time
   * @param {number} count - Number of cards
   * @param {number} theta - Quality coefficient
   * @returns {string} Time estimate
   */
  estimateGenerationTime(count, theta) {
    const baseTimePerCard = theta >= 0.6 ? 3 : 2; // seconds
    const totalSeconds = count * baseTimePerCard;

    if (totalSeconds < 60) {
      return `${totalSeconds} seconds`;
    }

    const minutes = Math.ceil(totalSeconds / 60);
    return `${minutes} minute${minutes > 1 ? 's' : ''}`;
  }
}

module.exports = new AdminController();
