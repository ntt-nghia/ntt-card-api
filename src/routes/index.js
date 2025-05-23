const express = require('express');
const authRoutes = require('./auth');
const userRoutes = require('./users');
const cardRoutes = require('./cards');
const gameSessionRoutes = require('./gameSessions');

const router = express.Router();

// API versioning
router.use('/v1/auth', authRoutes);
router.use('/v1/users', userRoutes);
// router.use('/v1/cards', cardRoutes);
// router.use('/v1/game-sessions', gameSessionRoutes);

// API info
router.get('/', (req, res) => {
  res.json({
    message: 'Connection-Building Drinking Card Game API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/v1/auth',
      users: '/api/v1/users',
      cards: '/api/v1/cards',
      gameSessions: '/api/v1/game-sessions'
    }
  });
});

module.exports = router;