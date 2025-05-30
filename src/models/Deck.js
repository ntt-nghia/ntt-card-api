const Joi = require('joi');

const MultilingualTextSchema = Joi.object({
  en: Joi.string().required(),
  vn: Joi.string().optional()
});

const CardCountSchema = Joi.object({
  total: Joi.number().integer().min(0).default(0),
  free: Joi.number().integer().min(0).default(0),
  premium: Joi.number().integer().min(0).default(0)
});

const DeckStatisticsSchema = Joi.object({
  purchases: Joi.number().integer().min(0).default(0),
  sessionsPlayed: Joi.number().integer().min(0).default(0),
  averageCompletion: Joi.number().min(0).max(1).default(0),
  rating: Joi.number().min(1).max(5).optional(),
  lastPlayedAt: Joi.date().optional()
});

const DeckSchema = Joi.object({
  id: Joi.string().optional(),
  name: MultilingualTextSchema.required(),
  description: MultilingualTextSchema.required(),
  relationshipType: Joi.string()
    .valid('friends', 'colleagues', 'new_couples', 'established_couples', 'family')
    .required(),
  tier: Joi.string().valid('FREE', 'PREMIUM').default('FREE'),
  price: Joi.number().min(0).default(0),
  currency: Joi.string().default('USD'),
  cardCount: CardCountSchema.default({}),
  tags: Joi.array().items(Joi.string()).default([]),
  difficulty: Joi.string().valid('beginner', 'intermediate', 'advanced').default('intermediate'),
  estimatedDuration: Joi.number().integer().min(15).max(120).default(30), // minutes
  iconUrl: Joi.string().uri().optional(),
  coverImageUrl: Joi.string().uri().optional(),
  color: Joi.string().pattern(/^#[0-9A-F]{6}$/i).optional(), // Hex color
  statistics: DeckStatisticsSchema.default({}),
  createdBy: Joi.string().required(),
  createdAt: Joi.date().default(() => new Date()),
  updatedAt: Joi.date().default(() => new Date()),
  publishedAt: Joi.date().optional(),
  status: Joi.string().valid('active', 'draft', 'archived').default('draft'),
  features: Joi.object({
    allowMixing: Joi.boolean().default(true), // Can be mixed with other decks
    requiresAllCards: Joi.boolean().default(false), // Must play all cards
    customProgression: Joi.boolean().default(false) // Has custom level progression
  }).default({})
}).required();

const validateDeck = (deckData) => DeckSchema.validate(deckData);

/**
 * Get deck text in specified language with fallback
 * @param {Object} deck - Deck object
 * @param {string} field - Field name ('name' or 'description')
 * @param {string} language - Desired language ('en' or 'vn')
 * @returns {string} Deck text
 */
const getDeckText = (deck, field, language = 'en') => {
  if (!deck[field]) return '';
  return deck[field][language] || deck[field].en || '';
};

/**
 * Check if user has access to deck
 * @param {Object} deck - Deck object
 * @param {Array} unlockedDecks - User's unlocked deck IDs
 * @returns {boolean} Has access
 */
const hasAccessToDeck = (deck, unlockedDecks = []) => deck.tier === 'FREE' || unlockedDecks.includes(deck.id);

module.exports = {
  DeckSchema,
  validateDeck,
  getDeckText,
  hasAccessToDeck,
  MultilingualTextSchema,
  CardCountSchema,
  DeckStatisticsSchema
};
