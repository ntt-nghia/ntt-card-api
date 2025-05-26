const Joi = require('joi');

const PlayerSchema = Joi.object({
  userId: Joi.string().required(),
  displayName: Joi.string().min(1).max(50).required(),
  connectionLevel: Joi.number().integer().min(1).max(4)
    .default(1),
  points: Joi.number().integer().min(0).default(0),
  isActive: Joi.boolean().default(true)
});

const GameConfigurationSchema = Joi.object({
  contentFilters: Joi.object().default({}),
  includeUnassignedCards: Joi.boolean().default(false), // Include cards not in any deck
  maxDuration: Joi.number().integer().min(900000).max(7200000)
    .optional(), // 15min - 2hrs
  winCondition: Joi.string().valid('first_to_level_4', 'highest_points', 'collaborative').default('first_to_level_4'),
  customRules: Joi.object().optional()
});

const GameSessionSchema = Joi.object({
  id: Joi.string().optional(),
  hostId: Joi.string().required(),

  // Core game settings
  relationshipType: Joi.string()
    .valid('friends', 'colleagues', 'new_couples', 'established_couples', 'family')
    .required(),

  // NEW: Deck selection
  selectedDeckIds: Joi.array().items(Joi.string()).min(1).default([]),

  // NEW: Language preference
  language: Joi.string().valid('en', 'vn').default('en'),

  // Game state
  currentLevel: Joi.number().integer().min(1).max(4)
    .default(1),
  status: Joi.string().valid('waiting', 'active', 'paused', 'completed').default('waiting'),

  // Card tracking
  drawnCards: Joi.array().items(Joi.string()).default([]),
  completedCards: Joi.array().items(Joi.string()).default([]),
  skippedCards: Joi.array().items(Joi.string()).default([]),

  // NEW: Pre-filtered card pool
  availableCardPool: Joi.array().items(Joi.string()).default([]),

  // Players (optional for future multiplayer)
  players: Joi.array().items(PlayerSchema).default([]),

  // Configuration
  configuration: GameConfigurationSchema.default({}),

  // Session metadata
  startedAt: Joi.date().default(() => new Date()),
  endedAt: Joi.date().optional(),
  pausedAt: Joi.date().optional(),

  // Analytics data
  analytics: Joi.object({
    totalDuration: Joi.number().integer().min(0).default(0),
    pauseDuration: Joi.number().integer().min(0).default(0),
    cardDrawRate: Joi.number().min(0).default(0),
    levelProgressionTime: Joi.object().default({})
  }).default({})
});

const validateGameSession = (sessionData) => GameSessionSchema.validate(sessionData);

/**
 * Calculate session statistics
 * @param {Object} session - Session object
 * @returns {Object} Statistics
 */
const calculateSessionStats = (session) => {
  const totalCards = session.drawnCards.length;
  const completedCards = session.completedCards.length;
  const skippedCards = session.skippedCards.length;

  return {
    totalCards,
    completedCards,
    skippedCards,
    completionRate: totalCards > 0 ? completedCards / totalCards : 0,
    skipRate: totalCards > 0 ? skippedCards / totalCards : 0,
    averageLevel: session.currentLevel,
    duration: session.endedAt
      ? new Date(session.endedAt) - new Date(session.startedAt)
      : new Date() - new Date(session.startedAt)
  };
};

/**
 * Check if session can draw more cards
 * @param {Object} session - Session object
 * @returns {boolean} Can draw
 */
const canDrawCard = (session) => session.status === 'active'
         && session.availableCardPool.length > session.drawnCards.length;

module.exports = {
  GameSessionSchema,
  validateGameSession,
  calculateSessionStats,
  canDrawCard,
  PlayerSchema,
  GameConfigurationSchema
};
