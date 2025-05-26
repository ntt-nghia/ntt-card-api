const Joi = require('joi');

const MultilingualContentSchema = Joi.object({
  en: Joi.string().min(10).max(500).required(),
  vn: Joi.string().min(10).max(500).optional()
});

const CardSchema = Joi.object({
  id: Joi.string().optional(),

  content: Joi.alternatives().try(
    Joi.string().min(10).max(500), // Legacy support
    MultilingualContentSchema
  ).required(),

  type: Joi.string().valid('question', 'challenge', 'scenario', 'connection', 'wild').required(),
  connectionLevel: Joi.number().integer().min(1).max(4)
    .required(),
  relationshipTypes: Joi.array().items(
    Joi.string().valid('friends', 'colleagues', 'new_couples', 'established_couples', 'family')
  ).min(1).required(),

  // NEW: Deck associations
  deckIds: Joi.array().items(Joi.string()).default([]),

  // NEW: Premium status
  status: Joi.string().valid('FREE', 'PREMIUM').default('FREE'),

  // NEW: Quality coefficient
  theta: Joi.number().min(0.1).max(1.0).default(0.5),

  categories: Joi.array().items(Joi.string()).default([]),
  contentWarnings: Joi.array().items(Joi.string()).default([]),

  statistics: Joi.object({
    timesDrawn: Joi.number().integer().min(0).default(0),
    skipRate: Joi.number().min(0).max(1).default(0),
    averageRating: Joi.number().min(1).max(5).optional(),
    // NEW: Language usage tracking
    languageUsage: Joi.object({
      en: Joi.number().integer().min(0).default(0),
      vn: Joi.number().integer().min(0).default(0)
    }).default({})
  }).default({}),

  status: Joi.string().valid('active', 'review', 'archived').default('review'),
  createdBy: Joi.string().required(),
  createdAt: Joi.date().default(() => new Date()),
  updatedAt: Joi.date().default(() => new Date())
});

const validateCard = (cardData) => {
  // Convert legacy string content to multilingual format
  if (typeof cardData.content === 'string') {
    cardData.content = { en: cardData.content };
  }

  return CardSchema.validate(cardData);
};

/**
 * Get card content in specified language with fallback
 * @param {Object} card - Card object
 * @param {string} language - Desired language ('en' or 'vn')
 * @returns {string} Card content
 */
const getCardContent = (card, language = 'en') => {
  if (typeof card.content === 'string') {
    return card.content; // Legacy support
  }

  return card.content[language] || card.content.en || '';
};

module.exports = {
  CardSchema,
  validateCard,
  getCardContent,
  MultilingualContentSchema
};
