const express = require('express');
const sessionController = require('../controllers/sessionController');
const { authenticateUser } = require('../middleware/auth');
const validate = require('../middleware/validation');
const { createGameSessionSchema } = require('../utils/validators');

const router = express.Router();

// All session routes require authentication
router.use(authenticateUser);

// Session management
router.post('/start', validate(createGameSessionSchema), sessionController.startSession);
router.get('/active', sessionController.getActiveSessions);
router.get('/:id', sessionController.getSession);
router.get('/:id/draw-card', sessionController.drawCard);
router.post('/:id/complete-card', sessionController.completeCard);
router.post('/:id/skip-card', sessionController.skipCard);
router.post('/:id/end', sessionController.endSession);
router.get('/:id/statistics', sessionController.getSessionStatistics);

module.exports = router;
