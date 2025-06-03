// src/routes/auth.js - Updated with new endpoints
const express = require('express');
const authController = require('../controllers/authController');
const {
  authenticateUser,
  requireAdmin
} = require('../middleware/auth');
const validate = require('../middleware/validation');
const {
  registerSchema,
  loginSchema,
  updateProfileSchema
} = require('../utils/validators');

const router = express.Router();

// Public routes
router.post('/register', validate(registerSchema), authController.register);
router.post('/login', validate(loginSchema), authController.login);
router.post('/forgot-password', authController.forgotPassword);
router.get('/health', authController.healthCheck);

// Protected routes (require authentication)
router.use(authenticateUser);

// User routes
router.post('/logout', authController.logout);
router.get('/profile', authController.getProfile);
router.patch('/profile', validate(updateProfileSchema), authController.updateProfile);
router.post('/refresh-token', authController.refreshToken);

// Admin routes
router.patch('/admin/users/:uid/role/admin', requireAdmin, authController.setAdminRole);
router.patch('/admin/users/:uid/role/user', requireAdmin, authController.revokeAdminRole);
router.delete('/admin/users/:uid', requireAdmin, authController.deleteUser);

module.exports = router;
