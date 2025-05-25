const express = require('express');
const authRoutes = require('./auth');
const userRoutes = require('./users');

const router = express.Router();

// API versioning
router.use('/v1/auth', authRoutes);
router.use('/v1/users', userRoutes);

// API info
router.get('/', (req, res) => {
  res.json({
    message: 'Connection-Building Drinking Card Game API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/v1/auth',
      users: '/api/v1/users',
      cards: '/api/v1/cards',
      session: '/api/v1/sessions'
    }
  });
});

module.exports = router;
