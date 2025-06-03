const express = require('express');
const adminController = require('../controllers/adminController');
const {
  authenticateUser,
  requireAdmin
} = require('../middleware/auth');

const router = express.Router();

// All admin routes require authentication and admin role
router.use(authenticateUser);
router.use(requireAdmin);

// Deck management
router.get('/decks', adminController.deckService.deckRepository.findAll);
router.get('/decks/:id', adminController.adminFindById);
router.post('/decks', adminController.adminCreateDeck);
router.patch('/decks/:id', adminController.adminUpdateDeck);
router.delete('/decks/:id', adminController.adminDeleteDeck);
router.post('/decks/:id/cards', adminController.adminAddCardsToDeck);
router.delete('/decks/:id/cards', adminController.adminRemoveCardsFromDeck);

// Card management
router.post('/cards', adminController.adminCreateCard);
router.patch('/cards/:id', adminController.adminUpdateCard);
router.delete('/cards/:id', adminController.adminDeleteCard);
router.post('/cards/bulk', adminController.adminBulkCreateCards);
router.post('/cards/generate', adminController.adminGenerateCards);

// Analytics
router.get('/analytics', adminController.adminGetAnalytics);
router.get('/analytics/decks/:id', adminController.adminGetDeckAnalytics);

module.exports = router;
