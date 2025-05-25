const express = require('express');
const authController = require('../controllers/authController');
const { authenticateUser } = require('../middleware/auth');
const validate = require('../middleware/validation');
const {
  registerSchema,
  loginSchema
} = require('../utils/validators');

const router = express.Router();

router.post('/register', validate(registerSchema), authController.register);
router.post('/login', validate(loginSchema), authController.login);
router.post('/logout', authenticateUser, authController.logout);
router.post('/forgot-password', authController.forgotPassword);
// src/routes/auth.js
router.use(authenticateUser);
router.patch('/update-profile', authController.updateProfile);

module.exports = router;
