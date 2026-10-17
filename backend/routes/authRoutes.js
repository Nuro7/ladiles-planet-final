const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

// Login (Public)
router.post('/login', (req, res) => authController.login(req, res));

// Register (Public)
router.post('/register', (req, res) => authController.register(req, res));

// Get current user details (Protected)
router.get('/me', protect, (req, res) => authController.getMe(req, res));

// Logout (Protected)
router.post('/logout', protect, (req, res) => authController.logout(req, res));

// Sync (Public or Auth middleware protected if you want, but normally called after frontend signup)
router.post('/sync', (req, res) => authController.syncUser(req, res));

module.exports = router;
