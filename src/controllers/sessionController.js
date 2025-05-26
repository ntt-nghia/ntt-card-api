const SessionService = require('../services/sessionService');
const { AppError } = require('../middleware/errorHandler');

class SessionController {
  constructor() {
    this.sessionService = new SessionService();
  }

  /**
   * Start new session
   * POST /api/sessions/start
   */
  startSession = async (req, res) => {
    const {
      relationshipType,
      selectedDeckIds,
      language,
      configuration
    } = req.body;

    if (!relationshipType) {
      throw new AppError('Relationship type is required', 400);
    }

    if (!selectedDeckIds || selectedDeckIds.length === 0) {
      throw new AppError('At least one deck must be selected', 400);
    }

    const sessionData = {
      hostId: req.user.uid,
      relationshipType,
      selectedDeckIds,
      language: language || req.user.language || 'en',
      configuration: configuration || {}
    };

    const session = await this.sessionService.startSession(sessionData);

    res.status(201).json({
      status: 'success',
      data: {
        session,
        message: 'Session started successfully'
      }
    });
  };

  /**
   * Get session by ID
   * GET /api/sessions/:id
   */
  getSession = async (req, res) => {
    const { id } = req.params;

    const session = await this.sessionService.getSessionById(id);

    // Verify user owns this session
    if (session.hostId !== req.user.uid) {
      throw new AppError('Access denied', 403);
    }

    res.status(200).json({
      status: 'success',
      data: { session }
    });
  };

  /**
   * Draw next card
   * GET /api/sessions/:id/draw-card
   */
  drawCard = async (req, res) => {
    const { id } = req.params;

    // Verify session ownership
    const session = await this.sessionService.getSessionById(id);
    if (session.hostId !== req.user.uid) {
      throw new AppError('Access denied', 403);
    }

    const card = await this.sessionService.drawCard(id);

    res.status(200).json({
      status: 'success',
      data: {
        card,
        currentLevel: session.currentLevel,
        cardsRemaining: session.availableCardPool.length - session.drawnCards.length - 1
      }
    });
  };

  /**
   * Complete card
   * POST /api/sessions/:id/complete-card
   */
  completeCard = async (req, res) => {
    const { id } = req.params;
    const { cardId } = req.body;

    if (!cardId) {
      throw new AppError('Card ID is required', 400);
    }

    // Verify session ownership
    const session = await this.sessionService.getSessionById(id);
    if (session.hostId !== req.user.uid) {
      throw new AppError('Access denied', 403);
    }

    const updatedSession = await this.sessionService.completeCard(id, cardId);

    res.status(200).json({
      status: 'success',
      data: {
        message: 'Card completed',
        currentLevel: updatedSession.currentLevel,
        completedCount: updatedSession.completedCards.length
      }
    });
  };

  /**
   * Skip card
   * POST /api/sessions/:id/skip-card
   */
  skipCard = async (req, res) => {
    const { id } = req.params;
    const { cardId } = req.body;

    if (!cardId) {
      throw new AppError('Card ID is required', 400);
    }

    // Verify session ownership
    const session = await this.sessionService.getSessionById(id);
    if (session.hostId !== req.user.uid) {
      throw new AppError('Access denied', 403);
    }

    await this.sessionService.skipCard(id, cardId);

    res.status(200).json({
      status: 'success',
      data: {
        message: 'Card skipped',
        skippedCount: session.skippedCards.length + 1
      }
    });
  };

  /**
   * End session
   * POST /api/sessions/:id/end
   */
  endSession = async (req, res) => {
    const { id } = req.params;

    // Verify session ownership
    const session = await this.sessionService.getSessionById(id);
    if (session.hostId !== req.user.uid) {
      throw new AppError('Access denied', 403);
    }

    const statistics = await this.sessionService.endSession(id);

    res.status(200).json({
      status: 'success',
      data: {
        message: 'Session ended',
        statistics
      }
    });
  };

  /**
   * Get user's active sessions
   * GET /api/sessions/active
   */
  getActiveSessions = async (req, res) => {
    const sessions = this.sessionService.getUserActiveSessions(req.user.uid);

    res.status(200).json({
      status: 'success',
      data: {
        count: sessions.length,
        sessions
      }
    });
  };

  /**
   * Get session statistics
   * GET /api/sessions/:id/statistics
   */
  getSessionStatistics = async (req, res) => {
    const { id } = req.params;

    // Verify session ownership
    const session = await this.sessionService.getSessionById(id);
    if (session.hostId !== req.user.uid) {
      throw new AppError('Access denied', 403);
    }

    const statistics = await this.sessionService.getSessionStatistics(id);

    res.status(200).json({
      status: 'success',
      data: { statistics }
    });
  };
}

module.exports = new SessionController();
