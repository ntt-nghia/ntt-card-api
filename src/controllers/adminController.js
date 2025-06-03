const DeckService = require('../services/deckService');
const CardService = require('../services/cardService');
const SessionService = require('../services/sessionService');
const { AppError } = require('../middleware/errorHandler');
const { info } = require('../utils/logger');
const AIContentService = require('../services/aiContentService');

class AdminController {
  constructor() {
    this.deckService = new DeckService();
    this.cardService = new CardService();
    this.sessionService = new SessionService();
    this.aiContentService = new AIContentService();
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

    // Validate required parameters
    if (!relationshipType || !connectionLevel) {
      throw new AppError('Relationship type and connection level are required', 400);
    }

    try {
      info(`Starting AI generation: ${count} cards for ${relationshipType}, level ${connectionLevel}, theta ${theta}`);

      // Generate cards using AI service
      const generatedCards = await this.aiContentService.generateCards({
        relationshipType,
        connectionLevel,
        count,
        theta,
        targetLanguages,
        deckId,
        userId: req.user.uid
      });

      if (generatedCards.length === 0) {
        throw new AppError('No unique cards could be generated. Try different parameters.', 400);
      }

      // Bulk create the generated cards
      const createdCards = await this.cardService.bulkCreateCards(
        generatedCards.map(card => ({
          ...card,
          createdBy: req.user.uid
        }))
      );

      // If deckId provided, add cards to deck
      if (deckId) {
        const cardIds = createdCards.map(card => card.id);
        await this.deckService.addCardsToDeck(deckId, cardIds);

        logger.info(`Added ${cardIds.length} generated cards to deck ${deckId}`);
      }

      // Clear session duplicates for next generation
      this.aiContentService.clearSessionDuplicates();

      // Log generation statistics
      const stats = this.aiContentService.getGenerationStats();
      logger.info('AI Generation completed:', {
        requestedCount: count,
        generatedCount: createdCards.length,
        relationshipType,
        connectionLevel,
        theta,
        languages: targetLanguages,
        deckId,
        stats
      });

      res.status(201)
        .json({
          status: 'success',
          data: {
            count: createdCards.length,
            cards: createdCards,
            message: `Successfully generated ${createdCards.length} unique cards`,
            metadata: {
              relationshipType,
              connectionLevel,
              theta,
              targetLanguages,
              deckId,
              qualityTier: theta >= 0.6 ? 'PREMIUM' : 'FREE'
            }
          }
        });

    } catch (error) {
      logger.error('AI Generation failed:', {
        error: error.message,
        stack: error.stack,
        parameters: {
          relationshipType,
          connectionLevel,
          count,
          theta,
          targetLanguages,
          deckId
        }
      });

      // Re-throw AppErrors as-is
      if (error instanceof AppError) {
        throw error;
      }

      // Handle specific AI service errors
      if (error.message.includes('rate limit')) {
        throw new AppError('AI service temporarily unavailable due to rate limiting. Please try again in a few minutes.', 429);
      }

      if (error.message.includes('API key')) {
        throw new AppError('AI service configuration error. Please contact administrator.', 500);
      }

      // Generic error
      throw new AppError('AI generation service encountered an error. Please try again.', 500);
    }
  };

  /**
   * Get AI generation statistics and health
   * GET /api/v1/admin/ai/status
   */
  adminGetAIStatus = async (req, res) => {
    try {
      const stats = this.aiContentService.getGenerationStats();

      // Test AI service connectivity
      const healthCheck = await this.testAIServiceHealth();

      res.status(200)
        .json({
          status: 'success',
          data: {
            aiService: {
              status: healthCheck.status,
              model: stats.model,
              responseTime: healthCheck.responseTime,
              lastError: healthCheck.error
            },
            statistics: {
              sessionDuplicatesCount: stats.sessionDuplicatesCount,
              batchCacheSize: stats.batchCacheSize
            },
            capabilities: {
              supportedLanguages: ['en', 'vn'],
              supportedRelationshipTypes: [
                'friends', 'colleagues', 'new_couples',
                'established_couples', 'family'
              ],
              thetaRange: {
                min: 0.1,
                max: 1.0
              },
              maxCardsPerRequest: 20
            }
          }
        });
    } catch (error) {
      logger.error('Failed to get AI status:', error);

      res.status(200)
        .json({
          status: 'success',
          data: {
            aiService: {
              status: 'error',
              error: error.message
            },
            statistics: {
              sessionDuplicatesCount: 0,
              batchCacheSize: 0
            }
          }
        });
    }
  };

  /**
   * Clear AI service session cache
   * POST /api/v1/admin/ai/clear-cache
   */
  adminClearAICache = async (req, res) => {
    try {
      this.aiContentService.clearSessionDuplicates();

      logger.info('AI service cache cleared by admin', { userId: req.user.uid });

      res.status(200)
        .json({
          status: 'success',
          data: {
            message: 'AI service cache cleared successfully'
          }
        });
    } catch (error) {
      logger.error('Failed to clear AI cache:', error);
      throw new AppError('Failed to clear AI cache', 500);
    }
  };

  /**
   * Batch generate cards for multiple configurations
   * POST /api/v1/admin/cards/batch-generate
   */
  adminBatchGenerateCards = async (req, res) => {
    const { configurations } = req.body;

    if (!Array.isArray(configurations) || configurations.length === 0) {
      throw new AppError('Configurations array is required', 400);
    }

    if (configurations.length > 10) {
      throw new AppError('Maximum 10 configurations per batch request', 400);
    }

    const results = [];
    const errors = [];

    try {
      for (let i = 0; i < configurations.length; i++) {
        const config = configurations[i];

        try {
          logger.info(`Processing batch configuration ${i + 1}/${configurations.length}`, config);

          const generatedCards = await this.aiContentService.generateCards({
            ...config,
            userId: req.user.uid
          });

          const createdCards = await this.cardService.bulkCreateCards(
            generatedCards.map(card => ({
              ...card,
              createdBy: req.user.uid
            }))
          );

          // Add to deck if specified
          if (config.deckId) {
            const cardIds = createdCards.map(card => card.id);
            await this.deckService.addCardsToDeck(config.deckId, cardIds);
          }

          results.push({
            configuration: config,
            success: true,
            count: createdCards.length,
            cards: createdCards
          });

          // Small delay between generations to avoid rate limiting
          if (i < configurations.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }

        } catch (error) {
          logger.error(`Batch generation failed for configuration ${i + 1}:`, error);

          errors.push({
            configuration: config,
            error: error.message
          });

          results.push({
            configuration: config,
            success: false,
            error: error.message
          });
        }
      }

      // Clear session duplicates after batch
      this.aiContentService.clearSessionDuplicates();

      const successCount = results.filter(r => r.success).length;
      const totalCards = results
        .filter(r => r.success)
        .reduce((sum, r) => sum + r.count, 0);

      res.status(200)
        .json({
          status: 'success',
          data: {
            message: `Batch generation completed: ${successCount}/${configurations.length} configurations successful`,
            summary: {
              totalConfigurations: configurations.length,
              successfulConfigurations: successCount,
              failedConfigurations: errors.length,
              totalCardsGenerated: totalCards
            },
            results,
            errors: errors.length > 0 ? errors : undefined
          }
        });

    } catch (error) {
      logger.error('Batch generation failed:', error);
      throw new AppError('Batch generation failed', 500);
    }
  };

  /**
   * Test AI service health (private method)
   * @returns {Object} Health check result
   * @private
   */
  async testAIServiceHealth() {
    const startTime = Date.now();

    try {
      // Simple test generation with minimal parameters
      await this.aiContentService.generateCards({
        relationshipType: 'friends',
        connectionLevel: 1,
        count: 1,
        theta: 0.3,
        targetLanguages: ['en']
      });

      return {
        status: 'healthy',
        responseTime: Date.now() - startTime,
        error: null
      };

    } catch (error) {
      return {
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        error: error.message
      };
    }
  }

  // ... (keeping all other existing methods) ...

  /**
   * Get system analytics (updated to include AI stats)
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

    try {
      // Get session analytics
      const sessionAnalytics = await this.sessionService.sessionRepository.getAnalytics(filters);

      // Get AI generation analytics
      const aiStats = this.aiContentService.getGenerationStats();

      // Get card analytics (including AI-generated cards)
      const CardRepository = require('../repositories/cardRepository');
      const cardRepository = new CardRepository();

      const allCards = await cardRepository.findByFilters({});
      const aiGeneratedCards = allCards.filter(card => card.createdBy === 'ai-system');

      const cardAnalytics = {
        totalCards: allCards.length,
        aiGeneratedCards: aiGeneratedCards.length,
        aiGeneratedPercentage: allCards.length > 0 ?
          (aiGeneratedCards.length / allCards.length * 100).toFixed(2) : 0,
        cardsByTier: {
          FREE: allCards.filter(card => card.tier === 'FREE').length,
          PREMIUM: allCards.filter(card => card.tier === 'PREMIUM').length
        },
        cardsByStatus: {
          active: allCards.filter(card => card.status === 'active').length,
          review: allCards.filter(card => card.status === 'review').length,
          archived: allCards.filter(card => card.status === 'archived').length
        }
      };

      res.status(200)
        .json({
          status: 'success',
          data: {
            type,
            dateRange: {
              start: filters.startDate || 'all time',
              end: filters.endDate || 'present'
            },
            sessions: sessionAnalytics,
            cards: cardAnalytics,
            aiService: {
              status: 'active',
              statistics: aiStats
            }
          }
        });

    } catch (error) {
      logger.error('Failed to get analytics:', error);
      throw new AppError('Failed to retrieve analytics', 500);
    }
  };
}

module.exports = new AdminController();
