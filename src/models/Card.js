const Joi = require('joi');

const CardSchema = Joi.object({
  id: Joi.string().optional(),
  content: Joi.string().min(10).max(500).required(),
  type: Joi.string().valid('question', 'challenge', 'scenario', 'connection', 'wild').required(),
  connectionLevel: Joi.number().integer().min(1).max(4).required(),
  relationshipTypes: Joi.array().items(
    Joi.string().valid('friends', 'colleagues', 'new_couples', 'established_couples', 'family')
  ).min(1).required(),
  categories: Joi.array().items(Joi.string()).default([]),
  metadata: Joi.object({
    estimatedResponseTime: Joi.number().integer().min(30).max(600).default(120), // seconds
    drinkingConsequence: Joi.object({
      onComplete: Joi.number().integer().min(0).max(3).default(0),
      onSkip: Joi.number().integer().min(0).max(3).default(1)
    }).default({}),
    completionCriteria: Joi.string().default('verbal_response')
  }).default({}),
  statistics: Joi.object({
    timesPlayed: Joi.number().integer().min(0).default(0),
    skipRate: Joi.number().min(0).max(1).default(0),
    averageRating: Joi.number().min(1).max(5).optional()
  }).default({}),
  status: Joi.string().valid('active', 'under_review', 'archived').default('under_review'),
  createdBy: Joi.string().required(),
  createdAt: Joi.date().default(() => new Date()),
  updatedAt: Joi.date().default(() => new Date())
});

const validateCard = (cardData) => {
  return CardSchema.validate(cardData);
};

module.exports = {
  CardSchema,
  validateCard
};