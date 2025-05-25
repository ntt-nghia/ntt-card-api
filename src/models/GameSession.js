const Joi = require('joi');

const PlayerSchema = Joi.object({
  userId: Joi.string().required(),
  displayName: Joi.string().min(1).max(50).required(),
  connectionLevel: Joi.number().integer().min(1).max(4).default(1),
  points: Joi.number().integer().min(0).default(0),
  isActive: Joi.boolean().default(true)
});

const GameSessionSchema = Joi.object({
  id: Joi.string().optional(),
  hostId: Joi.string().required(),
  relationshipType: Joi.string().valid('friends', 'colleagues', 'new_couples', 'established_couples', 'family').required(),
  currentLevel: Joi.number().integer().min(1).max(4).default(1),
  drawnCards: Joi.array().items(Joi.string()).default([]),
  completedCards: Joi.array().items(Joi.string()).default([]),
  skippedCards: Joi.array().items(Joi.string()).default([]),
  contentFilters: Joi.object().default({}),
  startedAt: Joi.date().default(() => new Date()),
});


const SessionAnalyticsSchema = Joi.object({
  date: Joi.string().required(), // YYYY-MM-DD format
  relationshipType: Joi.string().required(),
  sessionsCount: Joi.number().integer().min(0).default(0),
  averageDuration: Joi.number().min(0).default(0),
  averageCardsDrawn: Joi.number().min(0).default(0),
  averageSkipRate: Joi.number().min(0).max(1).default(0)
});


const validateGameSession = (sessionData) => {
  return GameSessionSchema.validate(sessionData);
};

module.exports = {
  GameSessionSchema,
  PlayerSchema,
  SessionAnalyticsSchema,
  validateGameSession
};
