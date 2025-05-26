const express = require('express');
const cardController = require('../controllers/cardController');
const { optionalAuth } = require('../middleware/auth');

const router = express.Router();

// Public routes (with optional auth for filtering)
router.get('/', optionalAuth, cardController.getCards);
router.get('/unassigned', optionalAuth, cardController.getUnassignedCards);
router.get('/:id', cardController.getCardById);

module.exports = router;
