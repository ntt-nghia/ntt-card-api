const Joi = require('joi');

// Age verification helper
const minimumAge = 18;
const maxBirthDate = new Date();
maxBirthDate.setFullYear(maxBirthDate.getFullYear() - minimumAge);

const registerSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
  displayName: Joi.string().min(1).max(50).required(),
  birthDate: Joi.date().max(maxBirthDate).required().messages({
    'date.max': 'You must be at least 18 years old to register'
  }),
  avatar: Joi.string().uri().optional()
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required()
});

const updateProfileSchema = Joi.object({
  displayName: Joi.string().min(1).max(50).optional(),
  avatar: Joi.string().uri().optional(),
  preferences: Joi.object({
    relationshipTypes: Joi.array().items(
      Joi.string().valid('friends', 'colleagues', 'new_couples', 'established_couples', 'family')
    ).optional(),
    contentFilters: Joi.object().optional(),
  }).optional()
});

const createGameSessionSchema = Joi.object({
  relationshipType: Joi.string()
    .valid('friends', 'colleagues', 'new_couples', 'established_couples', 'family')
    .required(),
  players: Joi.array()
    .items(Joi.object({
      displayName: Joi.string().min(1).max(50).required(),
      userId: Joi.string().optional()
    }))
    .min(2)
    .max(8)
    .required(),
  configuration: Joi.object({
    contentFilters: Joi.object().optional(),
    maxDuration: Joi.number().min(300000).max(7200000).optional(),
    winCondition: Joi.string().valid('first_to_level_4', 'highest_points', 'collaborative').default('first_to_level_4')
  }).optional()
});

module.exports = {
  registerSchema,
  loginSchema,
  updateProfileSchema,
  createGameSessionSchema,
  maxBirthDate
};
