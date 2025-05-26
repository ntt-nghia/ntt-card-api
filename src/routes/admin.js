const express = require('express');
const adminController = require('../controllers/adminController');
const { authenticateUser, requireAdmin } = require('../middleware/auth');
const validate = require('../middleware/validation');
const {
  createDeckSchema,
  createCardSchema,
  generateCardsSchema
} = require('../utils/validators');

const router = express.Router();

// All admin routes require authentication and admin role
router.use(authenticateUser);
router.use(requireAdmin);

// Deck management
router.get('/decks', adminController.deckService.deckRepository.findAll);
router.post('/decks', validate(createDeckSchema), adminController.createDeck);
router.patch('/decks/:id', adminController.updateDeck);
router.delete('/decks/:id', adminController.deleteDeck);
router.post('/decks/:id/cards', adminController.addCardsToDeck);
router.delete('/decks/:id/cards', adminController.removeCardsFromDeck);

// Card management
router.post('/cards', validate(createCardSchema), adminController.createCard);
router.patch('/cards/:id', adminController.updateCard);
router.delete('/cards/:id', adminController.deleteCard);
router.post('/cards/bulk', adminController.bulkCreateCards);
router.post('/cards/generate', validate(generateCardsSchema), adminController.generateCards);

// Analytics
router.get('/analytics', adminController.getAnalytics);
router.get('/analytics/decks/:id', adminController.getDeckAnalytics);

module.exports = router;
