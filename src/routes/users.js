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
router.get('/statistics', userController.getStatistics);
router.post('/game-completion', userController.recordGameCompletion);
router.delete('/account', userController.deleteAccount);

// Admin-only routes
router.get('/', requireAdmin, userController.getAllUsers);
router.get('/:uid', requireAdmin, userController.getUserById);

module.exports = router;