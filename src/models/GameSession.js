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
  relationshipType: Joi.string()
    .valid('friends', 'colleagues', 'new_couples', 'established_couples', 'family')
    .required(),
  status: Joi.string().valid('waiting', 'active', 'completed', 'abandoned').default('waiting'),
  players: Joi.array().items(PlayerSchema).min(2).max(8).required(),
  currentTurn: Joi.string().optional(),
  configuration: Joi.object({
    contentFilters: Joi.object().default({}),
    drinkingIntensity: Joi.string().valid('light', 'moderate', 'focus').default('moderate'),
    maxDuration: Joi.number().integer().min(300000).max(7200000).optional(),
    winCondition: Joi.string().valid('first_to_level_4', 'highest_points', 'collaborative').default('first_to_level_4')
  }).default({}),
  gameState: Joi.object({
    currentCard: Joi.string().optional(),
    cardHistory: Joi.array().items(Joi.string()).default([]),
    roundNumber: Joi.number().integer().min(1).default(1),
    startedAt: Joi.date().optional()
  }).default({}),
  createdAt: Joi.date().default(() => new Date()),
  updatedAt: Joi.date().default(() => new Date())
});

const validateGameSession = (sessionData) => {
  return GameSessionSchema.validate(sessionData);
};

module.exports = {
  GameSessionSchema,
  PlayerSchema,
  validateGameSession
};