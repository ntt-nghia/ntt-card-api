const Joi = require('joi');
const { maxBirthDate } = require('../utils/validators');

const PurchaseHistorySchema = Joi.object({
  deckId: Joi.string().required(),
  purchaseDate: Joi.date().required(),
  amount: Joi.number().min(0).required(),
  currency: Joi.string().default('USD'),
  transactionId: Joi.string().optional()
});

const UserSchema = Joi.object({
  uid: Joi.string().required(),
  email: Joi.string().email().required(),
  displayName: Joi.string().min(1).max(50).required(),
  avatar: Joi.string().uri().optional().allow(''),
  role: Joi.string().valid('user', 'admin').default('user'),
  birthDate: Joi.date().max(maxBirthDate).optional(),
  language: Joi.string().valid('en', 'vn').default('en'),
  unlockedDecks: Joi.array().items(Joi.string()).default([]),
  purchaseHistory: Joi.array().items(PurchaseHistorySchema).default([]),

  preferences: Joi.object({
    relationshipTypes: Joi.array().items(
      Joi.string().valid('friends', 'colleagues', 'new_couples', 'established_couples', 'family')
    ).default([]),
    contentFilters: Joi.object().default({})
  }).default({}),

  statistics: Joi.object({
    totalSessions: Joi.number().integer().min(0).default(0),
    relationshipTypeUsage: Joi.object().default({}),
    averageSessionDuration: Joi.number().min(0).default(0),
    favoriteRelationshipType: Joi.string().optional().allow(null),
    // Legacy fields for backward compatibility
    gamesPlayed: Joi.number().integer().min(0).default(0),
    connectionLevelsReached: Joi.object().default({})
  }).default({}),

  createdAt: Joi.date().default(() => new Date()),
  lastLoginAt: Joi.date().default(() => new Date())
});

const validateUser = (userData) => UserSchema.validate(userData, {
  allowUnknown: false,
  stripUnknown: true
});

const createUserData = (firebaseUser, additionalData = {}) => ({
  uid: firebaseUser.uid,
  email: firebaseUser.email,
  displayName: firebaseUser.displayName || additionalData.displayName,
  avatar: firebaseUser.photoURL || additionalData.avatar || '',
  birthDate: additionalData.birthDate,
  language: additionalData.language || 'en',
  unlockedDecks: [],
  purchaseHistory: [],
  preferences: {
    relationshipTypes: [],
    contentFilters: {},
    ...additionalData.preferences
  },
  statistics: {
    totalSessions: 0,
    relationshipTypeUsage: {},
    averageSessionDuration: 0,
    favoriteRelationshipType: null,
    // Legacy fields
    gamesPlayed: 0,
    connectionLevelsReached: {},
    ...additionalData.statistics
  },
  createdAt: new Date(),
  lastLoginAt: new Date()
});

module.exports = {
  UserSchema,
  validateUser,
  createUserData,
  PurchaseHistorySchema
};
