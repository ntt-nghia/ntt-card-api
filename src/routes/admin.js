const express = require('express');
const adminController = require('../controllers/adminController');
const {
  authenticateUser,
  requireAdmin
} = require('../middleware/auth');
const rateLimit = require('express-rate-limit');

const router = express.Router();
// Rate limiting for AI generation endpoints
const aiGenerationLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Limit each admin to 20 AI generation requests per windowMs
  message: {
    error: 'Too many AI generation requests, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false
});

const batchGenerationLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // Limit batch operations
  message: {
    error: 'Too many batch generation requests, please try again later.',
    retryAfter: '1 hour'
  }
});

// All admin routes require authentication and admin role
router.use(authenticateUser);
router.use(requireAdmin);

// Deck management
router.get('/decks', adminController.adminFindAll);
router.get('/decks/:id', adminController.adminFindById);
router.post('/decks', adminController.adminCreateDeck);
router.patch('/decks/:id', adminController.adminUpdateDeck);
router.delete('/decks/:id', adminController.adminDeleteDeck);
router.post('/decks/:id/cards', adminController.adminAddCardsToDeck);
router.delete('/decks/:id/cards', adminController.adminRemoveCardsFromDeck);

// Card management
router.get('/cards', adminController.adminGetAllCards);
router.post('/cards', adminController.adminCreateCard);
router.patch('/cards/:id', adminController.adminUpdateCard);
router.delete('/cards/:id', adminController.adminDeleteCard);
router.post('/cards/bulk', adminController.adminBulkCreateCards);
router.post('/cards/generate', adminController.adminGenerateCards);
/**
 * POST /api/admin/generate-cards
 * Generate AI-powered cards with advanced features
 */
router.post('/generate-cards', aiGenerationLimit, validateGenerationRequest, adminController.adminGenerateCards);

/**
 * POST /api/admin/batch-generate-cards
 * Generate cards for multiple configurations in batch
 */
router.post('/batch-generate-cards', batchGenerationLimit, validateBatchGenerationRequest, adminController.adminBatchGenerateCards
);

/**
 * GET /api/admin/generation-analytics
 * Get AI generation analytics and usage statistics
 */
router.get('/generation-analytics', adminController.getGenerationAnalytics);

/**
 * POST /api/admin/approve-cards
 * Approve or reject AI-generated cards
 */
router.post('/approve-cards', validateApprovalRequest, adminController.approveGeneratedCards
);

/**
 * GET /api/admin/pending-review-cards
 * Get cards pending human review
 */
router.get('/pending-review-cards', adminController.getPendingReviewCards);

/**
 * POST /api/admin/regenerate-cards
 * Regenerate specific cards with new parameters
 */
router.post('/regenerate-cards', aiGenerationLimit, validateRegenerationRequest, adminController.regenerateCards);

function validateGenerationRequest(req, res, next) {
  const {
    relationshipType,
    connectionLevel,
    count,
    theta,
    targetLanguages,
    deckId
  } = req.body;

  const errors = [];

  // Required fields
  if (!relationshipType) {
    errors.push('relationshipType is required');
  }
  else if (!['friends', 'colleagues', 'new_couples', 'established_couples', 'family'].includes(relationshipType)) {
    errors.push('Invalid relationshipType');
  }

  if (!connectionLevel) {
    errors.push('connectionLevel is required');
  }
  else if (!Number.isInteger(connectionLevel) || connectionLevel < 1 || connectionLevel > 4) {
    errors.push('connectionLevel must be an integer between 1 and 4');
  }

  // Optional fields validation
  if (count !== undefined) {
    if (!Number.isInteger(count) || count < 1 || count > 50) {
      errors.push('count must be an integer between 1 and 50');
    }
  }

  if (theta !== undefined) {
    if (typeof theta !== 'number' || theta < 0.1 || theta > 1.0) {
      errors.push('theta must be a number between 0.1 and 1.0');
    }
  }

  if (targetLanguages !== undefined) {
    if (!Array.isArray(targetLanguages) || targetLanguages.length === 0) {
      errors.push('targetLanguages must be a non-empty array');
    }
    else if (!targetLanguages.every(lang => typeof lang === 'string')) {
      errors.push('All targetLanguages must be strings');
    }
  }

  if (deckId !== undefined) {
    if (typeof deckId !== 'string' || deckId.trim() === '') {
      errors.push('deckId must be a non-empty string');
    }
  }

  if (errors.length > 0) {
    return res.status(400)
      .json({
        success: false,
        message: 'Validation failed',
        errors
      });
  }

  next();
}

/**
 * Validate batch generation request
 */
function validateBatchGenerationRequest(req, res, next) {
  const {
    configurations,
    globalTheta
  } = req.body;
  const errors = [];

  if (!Array.isArray(configurations)) {
    errors.push('configurations must be an array');
  }
  else if (configurations.length === 0) {
    errors.push('configurations array cannot be empty');
  }
  else if (configurations.length > 10) {
    errors.push('Maximum 10 configurations allowed per batch');
  }
  else {
    // Validate each configuration
    configurations.forEach((config, index) => {
      if (!config.relationshipType) {
        errors.push(`Configuration ${index}: relationshipType is required`);
      }
      if (!config.connectionLevel) {
        errors.push(`Configuration ${index}: connectionLevel is required`);
      }
      if (config.count && (!Number.isInteger(config.count) || config.count < 1 || config.count > 25)) {
        errors.push(`Configuration ${index}: count must be between 1 and 25 for batch operations`);
      }
    });
  }

  if (globalTheta !== undefined) {
    if (typeof globalTheta !== 'number' || globalTheta < 0.1 || globalTheta > 1.0) {
      errors.push('globalTheta must be a number between 0.1 and 1.0');
    }
  }

  if (errors.length > 0) {
    return res.status(400)
      .json({
        success: false,
        message: 'Batch validation failed',
        errors
      });
  }

  next();
}

/**
 * Validate card approval request
 */
function validateApprovalRequest(req, res, next) {
  const {
    cardIds,
    action
  } = req.body;
  const errors = [];

  if (!Array.isArray(cardIds)) {
    errors.push('cardIds must be an array');
  }
  else if (cardIds.length === 0) {
    errors.push('cardIds array cannot be empty');
  }
  else if (cardIds.length > 100) {
    errors.push('Maximum 100 cards can be processed at once');
  }
  else if (!cardIds.every(id => typeof id === 'string')) {
    errors.push('All cardIds must be strings');
  }

  if (!action || !['approve', 'reject'].includes(action)) {
    errors.push('action must be either "approve" or "reject"');
  }

  if (errors.length > 0) {
    return res.status(400)
      .json({
        success: false,
        message: 'Approval validation failed',
        errors
      });
  }

  next();
}

/**
 * Validate regeneration request
 */
function validateRegenerationRequest(req, res, next) {
  const {
    cardIds,
    newTheta,
    newTargetLanguages
  } = req.body;
  const errors = [];

  if (!Array.isArray(cardIds)) {
    errors.push('cardIds must be an array');
  }
  else if (cardIds.length === 0) {
    errors.push('cardIds array cannot be empty');
  }
  else if (cardIds.length > 20) {
    errors.push('Maximum 20 cards can be regenerated at once');
  }
  else if (!cardIds.every(id => typeof id === 'string')) {
    errors.push('All cardIds must be strings');
  }

  if (newTheta !== undefined) {
    if (typeof newTheta !== 'number' || newTheta < 0.1 || newTheta > 1.0) {
      errors.push('newTheta must be a number between 0.1 and 1.0');
    }
  }

  if (newTargetLanguages !== undefined) {
    if (!Array.isArray(newTargetLanguages) || newTargetLanguages.length === 0) {
      errors.push('newTargetLanguages must be a non-empty array');
    }
    else if (!newTargetLanguages.every(lang => typeof lang === 'string')) {
      errors.push('All newTargetLanguages must be strings');
    }
  }

  if (errors.length > 0) {
    return res.status(400)
      .json({
        success: false,
        message: 'Regeneration validation failed',
        errors
      });
  }

  next();
}

module.exports = router;
