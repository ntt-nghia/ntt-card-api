const express = require('express');
const deckController = require('../controllers/deckController');
const { authenticateUser, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// Public routes (with optional auth for access info)
router.get('/', optionalAuth, deckController.getAllDecks);
router.get('/:id', optionalAuth, deckController.getDeckById);
router.get('/:id/cards', optionalAuth, deckController.getDeckCards);
router.get('/:id/statistics', deckController.getDeckStatistics);

// Protected routes
router.use(authenticateUser);
router.post('/:id/unlock', deckController.unlockDeck);

module.exports = router;
