const Joi = require('joi');

/**
 * Card Schema with AI generation metadata
 */
const cardSchema = Joi.object({
  // Core content (multilingual support)
  content: Joi.object({
    en: Joi.string()
      .min(10)
      .max(500)
      .required(),
    vn: Joi.string()
      .min(10)
      .max(500)
      .optional() // Future Vietnamese support
  })
    .required(),

  // Card classification
  type: Joi.string()
    .valid('question', 'challenge', 'scenario', 'connection', 'wild')
    .required(),

  connectionLevel: Joi.number()
    .integer()
    .min(1)
    .max(4)
    .required(),

  relationshipTypes: Joi.array()
    .items(Joi.string()
      .valid('friends', 'colleagues', 'new_couples', 'established_couples', 'family'))
    .min(1)
    .required(),

  // Deck association
  deckIds: Joi.array()
    .items(Joi.string())
    .default([]),

  // Monetization tier
  tier: Joi.string()
    .valid('FREE', 'PREMIUM')
    .default('FREE'),

  // AI Generation metadata
  theta: Joi.number()
    .min(0.1)
    .max(1.0)
    .default(0.5),

  aiGenerated: Joi.boolean()
    .default(false),

  generationMetadata: Joi.object({
    model: Joi.string()
      .optional(), // e.g., 'gemini-1.5-pro'
    promptVersion: Joi.string()
      .optional(),
    batchId: Joi.string()
      .optional(),
    generatedAt: Joi.date()
      .optional(),
    cost: Joi.object({
      inputTokens: Joi.number()
        .optional(),
      outputTokens: Joi.number()
        .optional(),
      totalCost: Joi.number()
        .optional()
    })
      .optional()
  })
    .optional(),

  // Content organization
  categories: Joi.array()
    .items(Joi.string())
    .default([]),

  contentWarnings: Joi.array()
    .items(Joi.string())
    .default([]),

  // Usage statistics
  statistics: Joi.object({
    timesDrawn: Joi.number()
      .integer()
      .min(0)
      .default(0),
    skipRate: Joi.number()
      .min(0)
      .max(1)
      .default(0),
    languageUsage: Joi.object({
      en: Joi.number()
        .integer()
        .min(0)
        .default(0),
      vn: Joi.number()
        .integer()
        .min(0)
        .default(0)
    })
      .default({
        en: 0,
        vn: 0
      }),
    averageRating: Joi.number()
      .min(1)
      .max(5)
      .optional(),
    feedbackCount: Joi.number()
      .integer()
      .min(0)
      .default(0)
  })
    .default({
      timesDrawn: 0,
      skipRate: 0,
      languageUsage: {
        en: 0,
        vn: 0
      },
      feedbackCount: 0
    }),

  // Duplication prevention
  contentHash: Joi.string()
    .optional(), // SHA-256 hash of normalized content
  semanticFingerprint: Joi.string()
    .optional(), // For semantic similarity detection

  // Lifecycle management
  status: Joi.string()
    .valid('active', 'review', 'archived', 'draft')
    .default('review'), // AI-generated cards start in review

  createdBy: Joi.string()
    .required(),
  reviewedBy: Joi.string()
    .optional(),
  reviewedAt: Joi.date()
    .optional(),

  // Audit trail
  createdAt: Joi.date()
    .default(() => new Date()),
  updatedAt: Joi.date()
    .default(() => new Date()),

  // Replacement tracking
  replacedBy: Joi.string()
    .optional(), // ID of card that replaced this one
  replacedAt: Joi.date()
    .optional()
});

/**
 * Validate card data
 * @param {Object} cardData - Card data to validate
 * @returns {Object} Validation result
 */
function validateCard(cardData) {
  return cardSchema.validate(cardData, { abortEarly: false });
}

/**
 * Get content in specified language with fallback
 * @param {Object} card - Card object
 * @param {string} language - Preferred language
 * @returns {string} Card content
 */
function getCardContent(card, language = 'en') {
  if (typeof card.content === 'string') {
    return card.content; // Legacy format
  }

  return card.content[language] || card.content.en || '';
}

/**
 * Calculate content hash for duplication detection
 * @param {string} content - Card content
 * @returns {string} Content hash
 */
function calculateContentHash(content) {
  const crypto = require('crypto');

  // Normalize content before hashing
  const normalized = content
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  return crypto.createHash('sha256')
    .update(normalized)
    .digest('hex');
}

/**
 * Generate semantic fingerprint (simplified keyword extraction)
 * @param {string} content - Card content
 * @returns {string} Semantic fingerprint
 */
function generateSemanticFingerprint(content) {
  // Extract meaningful keywords (3+ characters, not common words)
  const commonWords = new Set([
    'the', 'and', 'or', 'but', 'you', 'your', 'what', 'how', 'when', 'where',
    'why', 'who', 'can', 'could', 'would', 'should', 'will', 'have', 'has',
    'had', 'this', 'that', 'these', 'those', 'with', 'from', 'for', 'about'
  ]);

  const keywords = content
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(word => word.length >= 3 && !commonWords.has(word))
    .sort()
    .slice(0, 10); // Top 10 keywords

  return keywords.join(',');
}

/**
 * Prepare card for database insertion
 * @param {Object} cardData - Raw card data
 * @returns {Object} Prepared card data
 */
function prepareCardForDB(cardData) {
  const prepared = { ...cardData };

  // Calculate content hash
  const content = getCardContent(prepared);
  if (content) {
    prepared.contentHash = calculateContentHash(content);
    prepared.semanticFingerprint = generateSemanticFingerprint(content);
  }

  // Set timestamps
  prepared.updatedAt = new Date();

  return prepared;
}

module.exports = {
  cardSchema,
  validateCard,
  getCardContent
};
