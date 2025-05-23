const express = require('express');
const authController = require('../controllers/authController');
const { authenticateUser } = require('../middleware/auth');
const validate = require('../middleware/validation');
const { registerSchema, loginSchema } = require('../utils/validators');

const router = express.Router();

router.post('/register', validate(registerSchema), authController.register);
router.post('/login', validate(loginSchema), authController.login);
router.post('/refresh', authController.refreshToken);
router.post('/logout', authenticateUser, authController.logout);
router.get('/verify-email/:token', authController.verifyEmail);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);

// Protected routes
router.use(authenticateUser);
router.get('/me', authController.getMe);
router.patch('/update-profile', authController.updateProfile);

module.exports = router;