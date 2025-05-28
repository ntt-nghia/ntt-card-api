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
  avatar: Joi.string().uri().optional(),
  language: Joi.string().valid('en', 'vn').optional() // NEW
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required()
});

const updateProfileSchema = Joi.object({
  displayName: Joi.string().min(1).max(50).optional(),
  avatar: Joi.string().uri().optional(),
  language: Joi.string().valid('en', 'vn').optional(), // NEW
  preferences: Joi.object({
    relationshipTypes: Joi.array().items(
      Joi.string().valid('friends', 'colleagues', 'new_couples', 'established_couples', 'family')
    ).optional(),
    contentFilters: Joi.object().optional()
  }).optional()
});

const createGameSessionSchema = Joi.object({
  relationshipType: Joi.string()
    .valid('friends', 'colleagues', 'new_couples', 'established_couples', 'family')
    .required(),
  selectedDeckIds: Joi.array() // UPDATED
    .items(Joi.string())
    .min(1)
    .required(),
  language: Joi.string().valid('en', 'vn').optional(), // NEW
  players: Joi.array()
    .items(Joi.object({
      displayName: Joi.string().min(1).max(50).required(),
      userId: Joi.string().optional()
    }))
    .min(2)
    .max(8)
    .optional(), // Made optional for single-host model
  configuration: Joi.object({
    contentFilters: Joi.object().optional(),
    includeUnassignedCards: Joi.boolean().optional(), // NEW
    maxDuration: Joi.number().min(300000).max(7200000).optional(),
    winCondition: Joi.string().valid('first_to_level_4', 'highest_points', 'collaborative').default('first_to_level_4')
  }).optional()
});

// NEW: Deck validation schemas
const createDeckSchema = Joi.object({
  name: Joi.object({
    en: Joi.string().required(),
    vn: Joi.string().optional()
  }).required(),
  description: Joi.object({
    en: Joi.string().required(),
    vn: Joi.string().optional()
  }).required(),
  relationshipType: Joi.string()
    .valid('friends', 'colleagues', 'new_couples', 'established_couples', 'family')
    .required(),
  type: Joi.string().valid('FREE', 'PREMIUM').required(),
  price: Joi.number().min(0).required().when('type', {
    is: 'PREMIUM',
    then: Joi.number().min(0.01).required(),
    otherwise: Joi.number().valid(0)
  }),
  tags: Joi.array().items(Joi.string()).optional(),
  iconUrl: Joi.string().uri().optional(),
  coverImageUrl: Joi.string().uri().optional()
});

const createCardSchema = Joi.object({
  content: Joi.alternatives().try(
    Joi.string().min(10).max(500),
    Joi.object({
      en: Joi.string().min(10).max(500).required(),
      vn: Joi.string().min(10).max(500).optional()
    })
  ).required(),
  type: Joi.string().valid('question', 'challenge', 'scenario', 'connection', 'wild').required(),
  connectionLevel: Joi.number().integer().min(1).max(4)
    .required(),
  relationshipTypes: Joi.array().items(
    Joi.string().valid('friends', 'colleagues', 'new_couples', 'established_couples', 'family')
  ).min(1).required(),
  deckIds: Joi.array().items(Joi.string()).optional(),
  tier: Joi.string().valid('FREE', 'PREMIUM').optional(),
  theta: Joi.number().min(0.1).max(1.0).optional(),
  categories: Joi.array().items(Joi.string()).optional(),
  contentWarnings: Joi.array().items(Joi.string()).optional()
});

const generateCardsSchema = Joi.object({
  relationshipType: Joi.string()
    .valid('friends', 'colleagues', 'new_couples', 'established_couples', 'family')
    .required(),
  connectionLevel: Joi.number().integer().min(1).max(4)
    .required(),
  count: Joi.number().integer().min(1).max(20)
    .default(5),
  theta: Joi.number().min(0.1).max(1.0).default(0.5),
  targetLanguages: Joi.array().items(Joi.string().valid('en', 'vn')).default(['en']),
  deckId: Joi.string().optional()
});

module.exports = {
  registerSchema,
  loginSchema,
  updateProfileSchema,
  createGameSessionSchema,
  createDeckSchema,
  createCardSchema,
  generateCardsSchema,
  maxBirthDate
};
