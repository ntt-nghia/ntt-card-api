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
router.post('/decks', validate(createDeckSchema), adminController.adminCreateDeck);
router.patch('/decks/:id', adminController.adminUpdateDeck);
router.delete('/decks/:id', adminController.adminDeleteDeck);
router.post('/decks/:id/cards', adminController.adminAddCardsToDeck);
router.delete('/decks/:id/cards', adminController.adminRemoveCardsFromDeck);

// Card management
router.post('/cards', validate(createCardSchema), adminController.adminCreateCard);
router.patch('/cards/:id', adminController.adminUpdateCard);
router.delete('/cards/:id', adminController.adminDeleteCard);
router.post('/cards/bulk', adminController.adminBulkCreateCards);
router.post('/cards/generate', validate(generateCardsSchema), adminController.adminGenerateCards);

// Analytics
router.get('/analytics', adminController.adminGetAnalytics);
router.get('/analytics/decks/:id', adminController.adminGetDeckAnalytics);

module.exports = router;
