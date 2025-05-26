const express = require('express');
const userController = require('../controllers/userController');
const { authenticateUser, requireAdmin } = require('../middleware/auth');
const validate = require('../middleware/validation');
const { updateProfileSchema } = require('../utils/validators');

const router = express.Router();

// All routes require authentication
router.use(authenticateUser);

// User profile routes
router.get('/profile', userController.getProfile);
router.patch('/profile', validate(updateProfileSchema), userController.updateProfile);
router.patch('/preferences', userController.updatePreferences);
router.patch('/language', userController.updateLanguage); // NEW
router.get('/statistics', userController.getStatistics);
router.post('/game-completion', userController.recordGameCompletion);
router.delete('/account', userController.deleteAccount);

// NEW: Deck and purchase routes
router.get('/decks', userController.getUserDecks);
router.get('/purchases', userController.getPurchaseHistory);

// Admin-only routes
router.get('/', requireAdmin, userController.getAllUsers);
router.get('/:uid', requireAdmin, userController.getUserById);

module.exports = router;
