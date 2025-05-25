const Joi = require('joi');
const { maxBirthDate } = require('../utils/validators');

const UserSchema = Joi.object({
  uid: Joi.string().required(),
  email: Joi.string().email().required(),
  displayName: Joi.string().min(1).max(50).required(),
  avatar: Joi.string().uri().optional().allow(''),
  role: Joi.string().valid('user', 'admin').default('user'),
  birthDate: Joi.date().max(maxBirthDate).optional(),
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
    favoriteRelationshipType: Joi.string().optional().allow(null)
  }).default({}),
  createdAt: Joi.date().default(() => new Date()),
  lastLoginAt: Joi.date().default(() => new Date())
});

const validateUser = (userData) => {
  return UserSchema.validate(userData, {
    allowUnknown: false,
    stripUnknown: true
  });
};

const createUserData = (firebaseUser, additionalData = {}) => {
  return {
    uid: firebaseUser.uid,
    email: firebaseUser.email,
    displayName: firebaseUser.displayName || additionalData.displayName,
    avatar: firebaseUser.photoURL || additionalData.avatar || '',
    birthDate: additionalData.birthDate,
    preferences: {
      relationshipTypes: [],
      contentFilters: {},
      ...additionalData.preferences
    },
    statistics: {
      gamesPlayed: 0,
      connectionLevelsReached: {},
      favoriteRelationshipType: null,
      ...additionalData.statistics
    },
    createdAt: new Date(),
    lastLoginAt: new Date()
  };
};

module.exports = {
  UserSchema,
  validateUser,
  createUserData
};
