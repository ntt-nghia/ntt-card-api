const express = require('express');
const authRoutes = require('./auth');
const userRoutes = require('./users');
const deckRoutes = require('./decks');
const cardRoutes = require('./cards');
const sessionRoutes = require('./sessions');
const adminRoutes = require('./admin');

const router = express.Router();

// API versioning
router.use('/v1/auth', authRoutes);
router.use('/v1/users', userRoutes);
router.use('/v1/decks', deckRoutes);
router.use('/v1/cards', cardRoutes);
router.use('/v1/sessions', sessionRoutes);
router.use('/v1/admin', adminRoutes);

// API info
router.get('/', (req, res) => {
  res.json({
    message: 'Connection-Building Drinking Card Game API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/v1/auth',
      users: '/api/v1/users',
      decks: '/api/v1/decks',
      cards: '/api/v1/cards',
      sessions: '/api/v1/sessions',
      admin: '/api/v1/admin'
    }
  });
});

module.exports = router;
